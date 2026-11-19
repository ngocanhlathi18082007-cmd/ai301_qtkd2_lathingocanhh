(function (root) {
  "use strict";

  // =========================================================================
  // 1. UTF-8 & Vietnamese Text Normalization Utilities
  // =========================================================================
  function utf8Encode(str) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(str);
    }
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        out.push(code);
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
    return new Uint8Array(out);
  }

  function utf8Decode(bytes) {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(bytes);
    }
    var out = "";
    var i = 0;
    while (i < bytes.length) {
      var c = bytes[i++];
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if (c > 191 && c < 224) {
        var c2 = bytes[i++];
        out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c >= 224 && c < 240) {
        var c2b = bytes[i++];
        var c3 = bytes[i++];
        out += String.fromCharCode(((c & 15) << 12) | ((c2b & 63) << 6) | (c3 & 63));
      } else {
        var b2 = bytes[i++];
        var b3 = bytes[i++];
        var b4 = bytes[i++];
        var cp = ((c & 7) << 18) | ((b2 & 63) << 12) | ((b3 & 63) << 6) | (b4 & 63);
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      }
    }
    return out;
  }

  function decodeTextFromBuffer(buf) {
    if (!buf) return "";
    var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (u8.length === 0) return "";

    // 1. UTF-16 LE BOM: FF FE
    if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xfe) {
      if (typeof TextDecoder !== "undefined") {
        try { return new TextDecoder("utf-16le").decode(u8.subarray(2)); } catch (_e) {}
      }
    }
    // 2. UTF-16 BE BOM: FE FF
    if (u8.length >= 2 && u8[0] === 0xfe && u8[1] === 0xff) {
      if (typeof TextDecoder !== "undefined") {
        try { return new TextDecoder("utf-16be").decode(u8.subarray(2)); } catch (_e) {}
      }
    }
    // 3. UTF-8 BOM: EF BB BF
    if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
      if (typeof TextDecoder !== "undefined") {
        try { return new TextDecoder("utf-8").decode(u8.subarray(3)); } catch (_e) {}
      }
      return utf8Decode(u8.subarray(3));
    }

    // 4. Heuristic check for UTF-16 LE without BOM (every other byte in first 64 bytes is 0)
    if (u8.length >= 8) {
      var nullEven = 0, nullOdd = 0, checkLen = Math.min(u8.length, 128);
      for (var k = 0; k < checkLen; k++) {
        if (u8[k] === 0) {
          if (k % 2 === 1) nullOdd++;
          else nullEven++;
        }
      }
      if (nullOdd > (checkLen / 4) && nullEven === 0 && typeof TextDecoder !== "undefined") {
        try { return new TextDecoder("utf-16le").decode(u8); } catch (_e) {}
      }
      if (nullEven > (checkLen / 4) && nullOdd === 0 && typeof TextDecoder !== "undefined") {
        try { return new TextDecoder("utf-16be").decode(u8); } catch (_e) {}
      }
    }

    // 5. Try strict UTF-8
    try {
      if (typeof TextDecoder !== "undefined") {
        var utf8Dec = new TextDecoder("utf-8", { fatal: true });
        return utf8Dec.decode(u8);
      }
    } catch (_utfErr) {
      // 6. UTF-8 failed -> Try Vietnamese ANSI (windows-1258) or windows-1252
      try {
        if (typeof TextDecoder !== "undefined") {
          return new TextDecoder("windows-1258").decode(u8);
        }
      } catch (_e1258) {
        try {
          if (typeof TextDecoder !== "undefined") {
            return new TextDecoder("windows-1252").decode(u8);
          }
        } catch (_e1252) {}
      }
    }

    // 7. Non-fatal UTF-8 fallback
    if (typeof TextDecoder !== "undefined") {
      try { return new TextDecoder("utf-8").decode(u8); } catch (_eFinal) {}
    }
    return utf8Decode(u8);
  }

  function stripAccents(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  }

  // =========================================================================
  // 2. CRC-32 & Pure-JS RFC 1951 DEFLATE Inflate (for real .xlsx ZIP files)
  // =========================================================================
  var CRC32_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildHuffmanTable(lengths, maxSymbol) {
    var maxBits = 0;
    var i;
    for (i = 0; i < maxSymbol; i++) {
      if (lengths[i] > maxBits) maxBits = lengths[i];
    }
    if (maxBits === 0) {
      return { maxBits: 1, counts: [0, 0], symbols: [] };
    }
    var counts = new Int32Array(maxBits + 1);
    for (i = 0; i < maxSymbol; i++) {
      if (lengths[i] > 0) counts[lengths[i]]++;
    }
    var offsets = new Int32Array(maxBits + 1);
    var left = 1;
    for (var len = 1; len <= maxBits; len++) {
      left <<= 1;
      left -= counts[len];
      offsets[len] = offsets[len - 1] + counts[len - 1];
    }
    var symbols = new Int32Array(maxSymbol);
    var pos = new Int32Array(maxBits + 1);
    for (i = 1; i <= maxBits; i++) pos[i] = offsets[i];
    for (i = 0; i < maxSymbol; i++) {
      var l = lengths[i];
      if (l > 0) {
        symbols[pos[l]++] = i;
      }
    }
    return { maxBits: maxBits, counts: counts, symbols: symbols };
  }

  var FIXED_LIT_TABLE = (function () {
    var lens = new Uint8Array(288);
    var i;
    for (i = 0; i <= 143; i++) lens[i] = 8;
    for (i = 144; i <= 255; i++) lens[i] = 9;
    for (i = 256; i <= 279; i++) lens[i] = 7;
    for (i = 280; i <= 287; i++) lens[i] = 8;
    return buildHuffmanTable(lens, 288);
  })();

  var FIXED_DIST_TABLE = (function () {
    var lens = new Uint8Array(32);
    for (var i = 0; i < 32; i++) lens[i] = 5;
    return buildHuffmanTable(lens, 32);
  })();

  var LEN_BASE = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258
  ];
  var LEN_EXTRA = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0
  ];
  var DIST_BASE = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577
  ];
  var DIST_EXTRA = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13
  ];
  var CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  function inflateRawSync(src) {
    var bytePos = 0;
    var bitBuf = 0;
    var bitCnt = 0;

    function readBits(n) {
      while (bitCnt < n) {
        if (bytePos >= src.length) throw new Error("Unexpected end of DEFLATE stream");
        bitBuf |= src[bytePos++] << bitCnt;
        bitCnt += 8;
      }
      var val = bitBuf & ((1 << n) - 1);
      bitBuf >>>= n;
      bitCnt -= n;
      return val;
    }

    function decodeSymbol(table) {
      var code = 0;
      var first = 0;
      var index = 0;
      for (var len = 1; len <= table.maxBits; len++) {
        code |= readBits(1);
        var count = table.counts[len];
        if (code - count < first) {
          return table.symbols[index + (code - first)];
        }
        index += count;
        first += count;
        first <<= 1;
        code <<= 1;
      }
      throw new Error("Invalid Huffman code in DEFLATE stream");
    }

    var out = [];
    var bfinal = 0;
    while (!bfinal) {
      bfinal = readBits(1);
      var btype = readBits(2);
      if (btype === 0) {
        bitBuf = 0;
        bitCnt = 0;
        var len = src[bytePos] | (src[bytePos + 1] << 8);
        var nlen = src[bytePos + 2] | (src[bytePos + 3] << 8);
        bytePos += 4;
        if ((len ^ 0xffff) !== nlen) throw new Error("Invalid stored block length");
        for (var k = 0; k < len; k++) {
          out.push(src[bytePos++]);
        }
      } else if (btype === 1 || btype === 2) {
        var litTable, distTable;
        if (btype === 1) {
          litTable = FIXED_LIT_TABLE;
          distTable = FIXED_DIST_TABLE;
        } else {
          var hlit = readBits(5) + 257;
          var hdist = readBits(5) + 1;
          var hclen = readBits(4) + 4;
          var clLens = new Uint8Array(19);
          for (var c = 0; c < hclen; c++) {
            clLens[CL_ORDER[c]] = readBits(3);
          }
          var clTable = buildHuffmanTable(clLens, 19);
          var allLens = new Uint8Array(hlit + hdist);
          var idx = 0;
          while (idx < hlit + hdist) {
            var sym = decodeSymbol(clTable);
            if (sym < 16) {
              allLens[idx++] = sym;
            } else {
              var repeat = 0;
              var val = 0;
              if (sym === 16) {
                val = allLens[idx - 1];
                repeat = 3 + readBits(2);
              } else if (sym === 17) {
                val = 0;
                repeat = 3 + readBits(3);
              } else {
                val = 0;
                repeat = 11 + readBits(7);
              }
              for (var r = 0; r < repeat; r++) {
                allLens[idx++] = val;
              }
            }
          }
          litTable = buildHuffmanTable(allLens.subarray(0, hlit), hlit);
          distTable = buildHuffmanTable(allLens.subarray(hlit, hlit + hdist), hdist);
        }

        while (true) {
          var s = decodeSymbol(litTable);
          if (s < 256) {
            out.push(s);
          } else if (s === 256) {
            break;
          } else {
            var lIdx = s - 257;
            var matchLen = LEN_BASE[lIdx] + (LEN_EXTRA[lIdx] ? readBits(LEN_EXTRA[lIdx]) : 0);
            var dSym = decodeSymbol(distTable);
            var dist = DIST_BASE[dSym] + (DIST_EXTRA[dSym] ? readBits(DIST_EXTRA[dSym]) : 0);
            var startPos = out.length - dist;
            for (var m = 0; m < matchLen; m++) {
              out.push(out[startPos + m]);
            }
          }
        }
      } else {
        throw new Error("Unsupported DEFLATE block type: " + btype);
      }
    }
    return new Uint8Array(out);
  }

  // =========================================================================
  // 3. ZIP Archive Reader & Writer (for .xlsx)
  // =========================================================================
  function readU16(bytes, pos) {
    return bytes[pos] | (bytes[pos + 1] << 8);
  }

  function readU32(bytes, pos) {
    return (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0;
  }

  function unzipEntries(arrayBuffer) {
    var bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    var eocdOffset = -1;
    var minOffset = Math.max(0, bytes.length - 65557);
    for (var i = bytes.length - 22; i >= minOffset; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) {
      throw new Error("File không phải định dạng ZIP/XLSX hợp lệ (thiếu EOCD).");
    }

    var totalEntries = readU16(bytes, eocdOffset + 10);
    var cdOffset = readU32(bytes, eocdOffset + 16);
    var entries = {};
    var ptr = cdOffset;

    for (var e = 0; e < totalEntries; e++) {
      if (readU32(bytes, ptr) !== 0x02014b50) break;
      var method = readU16(bytes, ptr + 10);
      var compSize = readU32(bytes, ptr + 20);
      var fnameLen = readU16(bytes, ptr + 28);
      var extraLen = readU16(bytes, ptr + 30);
      var commentLen = readU16(bytes, ptr + 32);
      var localOffset = readU32(bytes, ptr + 42);
      var fname = utf8Decode(bytes.subarray(ptr + 46, ptr + 46 + fnameLen));
      ptr += 46 + fnameLen + extraLen + commentLen;

      if (fname.charAt(fname.length - 1) === "/") continue;
      if (readU32(bytes, localOffset) !== 0x04034b50) continue;
      var lFnameLen = readU16(bytes, localOffset + 26);
      var lExtraLen = readU16(bytes, localOffset + 28);
      var dataStart = localOffset + 30 + lFnameLen + lExtraLen;
      var compSlice = bytes.subarray(dataStart, dataStart + compSize);

      if (method === 0) {
        entries[fname] = compSlice;
      } else if (method === 8) {
        entries[fname] = inflateRawSync(compSlice);
      } else {
        throw new Error("Không hỗ trợ phương thức nén ZIP: " + method + " cho " + fname);
      }
    }
    return entries;
  }

  function writeU16(arr, val) {
    arr.push(val & 0xff, (val >>> 8) & 0xff);
  }

  function writeU32(arr, val) {
    arr.push(val & 0xff, (val >>> 8) & 0xff, (val >>> 16) & 0xff, (val >>> 24) & 0xff);
  }

  function zipStoreEntries(fileMap) {
    var parts = [];
    var central = [];
    var offset = 0;
    var names = Object.keys(fileMap);

    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var nameBytes = utf8Encode(name);
      var dataBytes = typeof fileMap[name] === "string" ? utf8Encode(fileMap[name]) : fileMap[name];
      var crc = crc32(dataBytes);

      var lh = [];
      writeU32(lh, 0x04034b50);
      writeU16(lh, 20);
      writeU16(lh, 0x0800); // UTF-8 filename flag
      writeU16(lh, 0);      // STORE
      writeU16(lh, 0);
      writeU16(lh, 0);
      writeU32(lh, crc);
      writeU32(lh, dataBytes.length);
      writeU32(lh, dataBytes.length);
      writeU16(lh, nameBytes.length);
      writeU16(lh, 0);

      var lhArr = new Uint8Array(lh);
      parts.push(lhArr, nameBytes, dataBytes);

      var ch = [];
      writeU32(ch, 0x02014b50);
      writeU16(ch, 20);
      writeU16(ch, 20);
      writeU16(ch, 0x0800);
      writeU16(ch, 0);
      writeU16(ch, 0);
      writeU16(ch, 0);
      writeU32(ch, crc);
      writeU32(ch, dataBytes.length);
      writeU32(ch, dataBytes.length);
      writeU16(ch, nameBytes.length);
      writeU16(ch, 0);
      writeU16(ch, 0);
      writeU16(ch, 0);
      writeU16(ch, 0);
      writeU32(ch, 0);
      writeU32(ch, offset);

      central.push(new Uint8Array(ch), nameBytes);
      offset += lhArr.length + nameBytes.length + dataBytes.length;
    }

    var cdSize = 0;
    for (var j = 0; j < central.length; j++) cdSize += central[j].length;

    var eocd = [];
    writeU32(eocd, 0x06054b50);
    writeU16(eocd, 0);
    writeU16(eocd, 0);
    writeU16(eocd, names.length);
    writeU16(eocd, names.length);
    writeU32(eocd, cdSize);
    writeU32(eocd, offset);
    writeU16(eocd, 0);
    var eocdArr = new Uint8Array(eocd);

    var totalLen = offset + cdSize + eocdArr.length;
    var out = new Uint8Array(totalLen);
    var pos = 0;
    for (var p = 0; p < parts.length; p++) {
      out.set(parts[p], pos);
      pos += parts[p].length;
    }
    for (var c = 0; c < central.length; c++) {
      out.set(central[c], pos);
      pos += central[c].length;
    }
    out.set(eocdArr, pos);
    return out;
  }

  // =========================================================================
  // 4. XML Helpers & XLSX Parser / Writer
  // =========================================================================
  function decodeXmlEntities(str) {
    return String(str || "")
      .replace(/&#x([0-9a-fA-F]+);/g, function (_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      })
      .replace(/&#(\d+);/g, function (_, dec) {
        return String.fromCharCode(parseInt(dec, 10));
      })
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  function escapeXml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function parseAttrs(attrText) {
    var attrs = {};
    var re = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    var m;
    while ((m = re.exec(attrText)) !== null) {
      attrs[m[1]] = decodeXmlEntities(m[2] != null ? m[2] : m[3]);
    }
    return attrs;
  }

  function extractTagBlocks(xml, tagName) {
    var results = [];
    var re = new RegExp("<(?:[a-zA-Z0-9_-]+:)?" + tagName + "(\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?" + tagName + ">", "g");
    var m;
    while ((m = re.exec(xml)) !== null) {
      results.push({ attrs: parseAttrs(m[1] || ""), inner: m[2] });
    }
    return results;
  }

  function colLettersToIndex(letters) {
    var col = 0;
    for (var i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    return col - 1;
  }

  function indexToColLetters(idx) {
    var s = "";
    var n = idx + 1;
    while (n > 0) {
      var rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function excelSerialToIsoDate(serial) {
    var utcDays = Math.floor(serial - 25569);
    var d = new Date(utcDays * 86400000);
    if (isNaN(d.getTime())) return String(serial);
    var yyyy = d.getUTCFullYear();
    var mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    var dd = String(d.getUTCDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  }

  function parseSharedStringsXml(xml) {
    var strings = [];
    var siBlocks = extractTagBlocks(xml, "si");
    for (var i = 0; i < siBlocks.length; i++) {
      var cleanInner = siBlocks[i].inner.replace(/<rPh[\s\S]*?<\/rPh>/g, "");
      var tBlocks = extractTagBlocks(cleanInner, "t");
      var combined = "";
      for (var j = 0; j < tBlocks.length; j++) {
        combined += decodeXmlEntities(tBlocks[j].inner);
      }
      strings.push(combined);
    }
    return strings;
  }

  function parseStylesDateIds(xml) {
    var dateStyleIndices = {};
    if (!xml) return dateStyleIndices;
    var numFmtCustom = {};
    var numFmtMatches = xml.match(/<numFmt\s+[^>]*>/g) || [];
    for (var i = 0; i < numFmtMatches.length; i++) {
      var a = parseAttrs(numFmtMatches[i]);
      if (a.numFmtId && a.formatCode) {
        var code = a.formatCode.toLowerCase();
        if (/[ymd]/.test(code) && !/red|general|0\.00/.test(code)) {
          numFmtCustom[a.numFmtId] = true;
        }
      }
    }
    var cellXfsBlock = extractTagBlocks(xml, "cellXfs")[0];
    if (cellXfsBlock) {
      var xfMatches = cellXfsBlock.inner.match(/<xf\s+[^>]*>/g) || [];
      for (var j = 0; j < xfMatches.length; j++) {
        var xa = parseAttrs(xfMatches[j]);
        var fid = parseInt(xa.numFmtId || "0", 10);
        if ((fid >= 14 && fid <= 22) || (fid >= 45 && fid <= 47) || numFmtCustom[String(fid)]) {
          dateStyleIndices[j] = true;
        }
      }
    }
    return dateStyleIndices;
  }

  function parseWorksheetXml(xml, sharedStrings, dateStyleIndices) {
    var rows = [];
    var rowBlocks = extractTagBlocks(xml, "row");
    for (var r = 0; r < rowBlocks.length; r++) {
      var rowArr = [];
      var cellRe = /<(?:[a-zA-Z0-9_-]+:)?c(\s[\s\S]*?)?(?:\/>|>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?c>)/g;
      var cm;
      var autoCol = 0;
      while ((cm = cellRe.exec(rowBlocks[r].inner)) !== null) {
        var cAttrs = parseAttrs(cm[1] || "");
        var cInner = cm[2] || "";
        var colIdx = autoCol;
        if (cAttrs.r) {
          var colMatch = /^([A-Z]+)/i.exec(cAttrs.r);
          if (colMatch) colIdx = colLettersToIndex(colMatch[1].toUpperCase());
        }
        autoCol = colIdx + 1;

        var type = cAttrs.t || "";
        var val = "";
        if (type === "inlineStr") {
          var tBlocks = extractTagBlocks(cInner, "t");
          for (var tb = 0; tb < tBlocks.length; tb++) {
            val += decodeXmlEntities(tBlocks[tb].inner);
          }
        } else {
          var vBlock = extractTagBlocks(cInner, "v")[0];
          var rawVal = vBlock ? decodeXmlEntities(vBlock.inner) : "";
          if (type === "s") {
            val = sharedStrings[parseInt(rawVal, 10)] || "";
          } else if (type === "b") {
            val = rawVal === "1" ? "TRUE" : "FALSE";
          } else if (type === "str" || type === "e") {
            val = rawVal;
          } else if (rawVal !== "" && cAttrs.s && dateStyleIndices[parseInt(cAttrs.s, 10)]) {
            var num = Number(rawVal);
            val = !isNaN(num) && num > 20000 && num < 80000 ? excelSerialToIsoDate(num) : rawVal;
          } else {
            val = rawVal;
          }
        }
        while (rowArr.length <= colIdx) rowArr.push("");
        rowArr[colIdx] = val;
      }
      if (rowArr.some(function (cell) { return String(cell).trim() !== ""; })) {
        rows.push(rowArr);
      }
    }
    return rows;
  }

  function parseXlsxArrayBuffer(arrayBuffer) {
    var entries = unzipEntries(arrayBuffer);
    var sharedStrings = entries["xl/sharedStrings.xml"]
      ? parseSharedStringsXml(utf8Decode(entries["xl/sharedStrings.xml"]))
      : [];
    var dateStyleIndices = entries["xl/styles.xml"]
      ? parseStylesDateIds(utf8Decode(entries["xl/styles.xml"]))
      : {};

    var relsMap = {};
    if (entries["xl/_rels/workbook.xml.rels"]) {
      var relsXml = utf8Decode(entries["xl/_rels/workbook.xml.rels"]);
      var relTags = relsXml.match(/<Relationship\s+[^>]*>/g) || [];
      for (var i = 0; i < relTags.length; i++) {
        var ra = parseAttrs(relTags[i]);
        if (ra.Id && ra.Target) {
          var target = ra.Target.replace(/^\/+/, "");
          if (target.indexOf("xl/") !== 0) target = "xl/" + target;
          relsMap[ra.Id] = target;
        }
      }
    }

    var sheetDescriptors = [];
    if (entries["xl/workbook.xml"]) {
      var wbXml = utf8Decode(entries["xl/workbook.xml"]);
      var sheetTags = wbXml.match(/<(?:[a-zA-Z0-9_-]+:)?sheet\s+[^>]*>/g) || [];
      for (var s = 0; s < sheetTags.length; s++) {
        var sa = parseAttrs(sheetTags[s]);
        var rid = sa["r:id"] || sa.id;
        var path = (rid && relsMap[rid]) || ("xl/worksheets/sheet" + (s + 1) + ".xml");
        if (entries[path]) {
          sheetDescriptors.push({ name: sa.name || ("Sheet" + (s + 1)), path: path });
        }
      }
    }

    if (sheetDescriptors.length === 0) {
      var keys = Object.keys(entries).filter(function (k) {
        return /^xl\/worksheets\/sheet\d+\.xml$/i.test(k);
      }).sort();
      for (var k = 0; k < keys.length; k++) {
        sheetDescriptors.push({ name: "Sheet" + (k + 1), path: keys[k] });
      }
    }

    if (sheetDescriptors.length === 0) {
      throw new Error("Không tìm thấy sheet dữ liệu nào trong file XLSX.");
    }

    var sheets = {};
    var sheetNames = [];
    for (var d = 0; d < sheetDescriptors.length; d++) {
      var desc = sheetDescriptors[d];
      var xmlText = utf8Decode(entries[desc.path]);
      var grid = parseWorksheetXml(xmlText, sharedStrings, dateStyleIndices);
      sheets[desc.name] = gridToTableObject(grid);
      sheetNames.push(desc.name);
    }
    return { sheetNames: sheetNames, sheets: sheets };
  }

  function buildXlsxUint8Array(sheetList) {
    // sheetList: [{ name: "Leads", headers: [...], rows: [[...], ...] }]
    var files = {};
    var sheetOverrides = "";
    var workbookSheets = "";
    var relsXmlEntries = "";

    for (var idx = 0; idx < sheetList.length; idx++) {
      var sheet = sheetList[idx];
      var sheetNum = idx + 1;
      var sheetPath = "xl/worksheets/sheet" + sheetNum + ".xml";
      sheetOverrides += '<Override PartName="/' + sheetPath + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      workbookSheets += '<sheet name="' + escapeXml(sheet.name.slice(0, 31)) + '" sheetId="' + sheetNum + '" r:id="rId' + sheetNum + '"/>';
      relsXmlEntries += '<Relationship Id="rId' + sheetNum + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + sheetNum + '.xml"/>';

      var allRows = [sheet.headers].concat(sheet.rows);
      var rowsXml = "";
      for (var r = 0; r < allRows.length; r++) {
        var rowNum = r + 1;
        var cellsXml = "";
        var row = allRows[r] || [];
        for (var c = 0; c < row.length; c++) {
          var cellRef = indexToColLetters(c) + rowNum;
          var raw = row[c];
          if (raw === null || raw === undefined) raw = "";
          if (typeof raw === "number" && !isNaN(raw) && isFinite(raw) && r > 0) {
            cellsXml += '<c r="' + cellRef + '"><v>' + raw + "</v></c>";
          } else {
            var styleAttr = r === 0 ? ' s="1"' : "";
            cellsXml += '<c r="' + cellRef + '" t="inlineStr"' + styleAttr + '><is><t xml:space="preserve">' + escapeXml(String(raw)) + "</t></is></c>";
          }
        }
        rowsXml += '<row r="' + rowNum + '">' + cellsXml + "</row>";
      }

      files[sheetPath] =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        "<sheetData>" + rowsXml + "</sheetData>" +
        "</worksheet>";
    }

    var stylesId = sheetList.length + 1;
    relsXmlEntries += '<Relationship Id="rId' + stylesId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

    files["[Content_Types].xml"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheetOverrides +
      "</Types>";

    files["_rels/.rels"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      "</Relationships>";

    files["xl/workbook.xml"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      "<sheets>" + workbookSheets + "</sheets>" +
      "</workbook>";

    files["xl/_rels/workbook.xml.rels"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      relsXmlEntries +
      "</Relationships>";

    files["xl/styles.xml"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
      "</styleSheet>";

    return zipStoreEntries(files);
  }

  // =========================================================================
  // 5. CSV / TSV Delimited Text Parser & Serializer
  // =========================================================================
  function detectDelimiter(text) {
    if (!text) return ",";
    var lines = text
      .split(/\r\n|\n|\r/)
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; })
      .slice(0, 10);
    if (lines.length === 0) return ",";

    var candidates = [",", ";", "\t", "|"];
    var scores = { ",": 0, ";": 0, "\t": 0, "|": 0 };

    candidates.forEach(function (delim) {
      var counts = lines.map(function (line) {
        var unquoted = line.replace(/"[^"]*"/g, "");
        var count = 0;
        for (var i = 0; i < unquoted.length; i++) {
          if (unquoted.charAt(i) === delim) count++;
        }
        return count;
      });

      var headerCount = counts[0] || 0;
      if (headerCount === 0) return;

      var consistent = 0;
      for (var k = 1; k < counts.length; k++) {
        if (counts[k] === headerCount) consistent += 3;
        else if (counts[k] > 0) consistent += 1;
      }
      scores[delim] = headerCount * 12 + consistent * 6;
    });

    var best = ",";
    var maxScore = 0;
    candidates.forEach(function (d) {
      if (scores[d] > maxScore) {
        maxScore = scores[d];
        best = d;
      }
    });

    if (maxScore === 0) {
      var fl = lines[0] || "";
      var cC = (fl.match(/,/g) || []).length;
      var sC = (fl.match(/;/g) || []).length;
      var tC = (fl.match(/\t/g) || []).length;
      var pC = (fl.match(/\|/g) || []).length;
      if (tC > cC && tC >= sC) return "\t";
      if (sC > cC) return ";";
      if (pC > cC) return "|";
      return ",";
    }

    return best;
  }

  function parseCSV(text, forcedDelimiter) {
    var clean = String(text || "")
      .replace(/^\uFEFF/, "")
      .replace(/[\u0000\uFEFF]/g, "");
    if (!clean.trim()) return { headers: [], records: [], rawRows: [] };

    // 1. Check for HTML Table (often used in .xls exported from ERP / Accounting software)
    if (/<table[\s\S]*?<\/table>/i.test(clean)) {
      var htmlGrid = [];
      var trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      var trMatch;
      while ((trMatch = trRegex.exec(clean)) !== null) {
        var rowArr = [];
        var cellRegex = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
        var cellMatch;
        while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
          var cellVal = cellMatch[1]
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .trim();
          rowArr.push(cellVal);
        }
        if (rowArr.some(function (c) { return c !== ""; })) {
          htmlGrid.push(rowArr);
        }
      }
      if (htmlGrid.length > 0) {
        return gridToTableObject(htmlGrid);
      }
    }

    // 2. Check for XML Spreadsheet (SpreadsheetML .xls)
    if (/<(?:ss:)?Workbook[\s\S]*?<(?:ss:)?Worksheet/i.test(clean)) {
      var xmlGrid = [];
      var rowRegex = /<(?:ss:)?Row[^>]*>([\s\S]*?)<\/(?:ss:)?Row>/gi;
      var rowMatch;
      while ((rowMatch = rowRegex.exec(clean)) !== null) {
        var rowCells = [];
        var cellRe = /<(?:ss:)?Cell[^>]*>[\s\S]*?<(?:ss:)?Data[^>]*>([\s\S]*?)<\/(?:ss:)?Data>[\s\S]*?<\/(?:ss:)?Cell>/gi;
        var cm;
        while ((cm = cellRe.exec(rowMatch[1])) !== null) {
          rowCells.push(decodeXmlEntities(cm[1].trim()));
        }
        if (rowCells.some(function (c) { return c !== ""; })) {
          xmlGrid.push(rowCells);
        }
      }
      if (xmlGrid.length > 0) {
        return gridToTableObject(xmlGrid);
      }
    }

    var delimiter = forcedDelimiter || detectDelimiter(clean);

    var grid = [];
    var row = [];
    var cell = "";
    var inQuotes = false;
    var len = clean.length;

    for (var i = 0; i < len; i++) {
      var ch = clean.charAt(i);
      var next = i + 1 < len ? clean.charAt(i + 1) : "";
      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          row.push(cell.trim());
          cell = "";
        } else if (ch === "\r" && next === "\n") {
          row.push(cell.trim());
          grid.push(row);
          row = [];
          cell = "";
          i++;
        } else if (ch === "\n" || ch === "\r") {
          row.push(cell.trim());
          grid.push(row);
          row = [];
          cell = "";
        } else {
          cell += ch;
        }
      }
    }
    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      grid.push(row);
    }

    var nonEmptyGrid = grid.filter(function (r) {
      return r.some(function (v) { return String(v).trim() !== ""; });
    });

    if (nonEmptyGrid.length === 0) {
      return { headers: [], records: [], rawRows: [] };
    }

    // Auto-rescue: If parsed only 1 column across rows (wrong delimiter assumed), try alternative delimiters
    if (nonEmptyGrid[0].length === 1 && !forcedDelimiter) {
      var altDelims = [";", ",", "\t", "|"].filter(function (d) { return d !== delimiter; });
      for (var ad = 0; ad < altDelims.length; ad++) {
        var alt = altDelims[ad];
        if (clean.indexOf(alt) !== -1) {
          var retryTbl = parseCSV(clean, alt);
          if (retryTbl.headers.length > 1) {
            return retryTbl;
          }
        }
      }
    }

    return gridToTableObject(nonEmptyGrid);
  }

  function gridToTableObject(grid) {
    if (!grid || grid.length === 0) return { headers: [], records: [], rawRows: [] };

    // Auto-detect best header row within first 5 rows (skips title banner rows)
    var headerRowIdx = 0;
    var maxNonBlank = 0;
    for (var r = 0; r < Math.min(grid.length, 5); r++) {
      var row = grid[r] || [];
      var nonBlank = row.filter(function (c) { return String(c || "").trim() !== ""; }).length;
      if (nonBlank > maxNonBlank) {
        maxNonBlank = nonBlank;
        headerRowIdx = r;
      }
    }

    // If only 1 row total, treat row 0 as data and synthesize headers
    if (grid.length === 1 && maxNonBlank > 0) {
      var synthHeaders = grid[0].map(function (_c, idx) { return "Cột " + (idx + 1); });
      var singleObj = {};
      for (var sc = 0; sc < synthHeaders.length; sc++) {
        singleObj[synthHeaders[sc]] = String(grid[0][sc] || "").trim();
      }
      return { headers: synthHeaders, records: [singleObj], rawRows: [grid[0]] };
    }

    var seenHeaders = {};
    var headers = (grid[headerRowIdx] || []).map(function (h, idx) {
      var trimmed = String(h || "").trim();
      if (!trimmed) trimmed = "Cột " + (idx + 1);
      if (seenHeaders[trimmed]) {
        var count = 2;
        while (seenHeaders[trimmed + "_" + count]) count++;
        trimmed = trimmed + "_" + count;
      }
      seenHeaders[trimmed] = true;
      return trimmed;
    });

    var records = [];
    for (var i = headerRowIdx + 1; i < grid.length; i++) {
      var row = grid[i];
      if (!row) continue;
      var obj = {};
      var hasAnyVal = false;
      for (var c = 0; c < headers.length; c++) {
        var val = row[c] !== undefined ? String(row[c]).trim() : "";
        obj[headers[c]] = val;
        if (val !== "") hasAnyVal = true;
      }
      if (hasAnyVal) {
        records.push(obj);
      }
    }
    return { headers: headers, records: records, rawRows: grid.slice(headerRowIdx + 1) };
  }

  function toCSV(headers, rows) {
    function esc(val) {
      var s = val === null || val === undefined ? "" : String(val);
      if (/[",\n\r]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }
    var lines = [headers.map(esc).join(",")];
    for (var i = 0; i < rows.length; i++) {
      lines.push(rows[i].map(esc).join(","));
    }
    return "\uFEFF" + lines.join("\r\n");
  }

  // =========================================================================
  // 6. Google Sheets Link Parser & Fetcher
  // =========================================================================
  function parseGoogleSheetUrl(url) {
    var raw = String(url || "").trim();
    var gidMatch = /[?#&]gid=(\d+)/.exec(raw);
    var gid = gidMatch ? gidMatch[1] : "0";

    var pubMatch = /\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/.exec(raw);
    if (pubMatch) {
      var pubId = pubMatch[1];
      return {
        isPublishedUrl: true,
        spreadsheetId: pubId,
        gid: gid,
        gvizCsvUrl: "https://docs.google.com/spreadsheets/d/e/" + pubId + "/pub?output=csv&gid=" + gid,
        exportCsvUrl: "https://docs.google.com/spreadsheets/d/e/" + pubId + "/pub?output=csv",
        exportXlsxUrl: "https://docs.google.com/spreadsheets/d/e/" + pubId + "/pub?output=xlsx"
      };
    }

    var idMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(raw);
    if (!idMatch) {
      throw new Error("Link Google Sheet không hợp lệ. Vui lòng dán link dạng https://docs.google.com/spreadsheets/d/...");
    }
    var spreadsheetId = idMatch[1];
    return {
      isPublishedUrl: false,
      spreadsheetId: spreadsheetId,
      gid: gid,
      gvizCsvUrl: "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/gviz/tq?tqx=out:csv&gid=" + gid,
      exportCsvUrl: "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?format=csv&gid=" + gid,
      exportXlsxUrl: "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?format=xlsx"
    };
  }

  function fetchGoogleSheetTable(url) {
    var parsed = parseGoogleSheetUrl(url);
    var candidates = [parsed.gvizCsvUrl, parsed.exportCsvUrl];

    function tryNext(idx, lastErr) {
      if (idx >= candidates.length) {
        return Promise.reject(
          new Error(
            "Không tải được dữ liệu trực tiếp từ Google Sheet (" +
            (lastErr ? lastErr.message : "CORS hoặc Sheet chưa mở quyền công khai") +
            "). Hãy bật chia sẻ 'Bất kỳ ai có liên kết -> Người xem', hoặc tải Google Sheet về CSV/XLSX rồi kéo thả vào khung Upload."
          )
        );
      }
      return fetch(candidates[idx], { mode: "cors" })
        .then(function (resp) {
          if (!resp.ok) {
            throw new Error("HTTP " + resp.status);
          }
          return resp.text();
        })
        .then(function (text) {
          if (/^\s*<!doctype html/i.test(text) || /<html[\s>]/i.test(text) && /accounts\.google\.com/i.test(text)) {
            throw new Error("Google Sheet đang ở chế độ riêng tư (yêu cầu đăng nhập)");
          }
          var table = parseCSV(text, ",");
          if (table.headers.length === 0 || table.records.length === 0) {
            throw new Error("Sheet không có dòng dữ liệu");
          }
          return {
            meta: parsed,
            table: table
          };
        })
        .catch(function (err) {
          return tryNext(idx + 1, err);
        });
    }
    return tryNext(0, null);
  }

  // =========================================================================
  // 7. Smart Column Auto-Mapping & Normalization to Lead Schema
  // =========================================================================
  var FIELD_SYNONYMS = {
    lead_id: [
      "lead_id", "id", "ma lead", "ma ho so", "stt", "code", "ma kh", "ma",
      "so tt", "no", "ma dong", "ma don", "ma hang", "order id", "ma gd", "dong"
    ],
    created_at: [
      "created_at", "ngay dang ky", "thoi gian dang ky", "ngay tao", "timestamp",
      "created", "ngay", "thoi gian", "date", "thang", "month", "nam", "year", "ky", "thoi diem"
    ],
    source: [
      "source", "nguon", "kenh", "channel", "chien dich", "campaign", "nguon khach",
      "nguon den", "utm source", "kenh ban", "kenh phan phoi", "diem ban", "phuong thuc", "platform", "kenh ban hang"
    ],
    company_name: [
      "company_name", "company", "ten cong ty", "cong ty", "doanh nghiep", "ten doanh nghiep",
      "don vi", "khach hang", "ten khach hang", "organization", "ten dn", "doi tac",
      "ten doi tac", "ten don vi", "to chuc", "khach", "chu the", "ten kh", "ten khach", "nguoi mua", "buyer", "customer name", "client name"
    ],
    tax_id: ["tax_id", "mst", "ma so thue", "tax code", "taxid", "ma thue"],
    contact_name: [
      "contact_name", "nguoi lien he", "ho ten", "ten lien he", "nguoi dang ky",
      "contact person", "full name", "contact", "name", "ho va ten", "ten nguoi lien he",
      "dai dien", "nguoi phu trach"
    ],
    contact_role: ["contact_role", "chuc vu", "vai tro", "vi tri", "role", "job title", "title", "chuc danh"],
    email: ["email", "thu dien tu", "e-mail", "mail", "dia chi email", "email cong ty", "email ca nhan"],
    phone: ["phone", "sdt", "so dien thoai", "dien thoai", "mobile", "tel", "zalo", "hotline", "so dt", "so di dong", "telephone"],
    region: [
      "region", "khu vuc", "tinh thanh", "tinh", "thanh pho", "dia diem", "dia chi",
      "city", "location", "vung", "address", "tru so", "mien", "chi nhanh"
    ],
    industry: ["industry", "nganh nghe", "nganh", "linh vuc", "sector", "nganh hang", "linh vuc hoat dong"],
    company_size: [
      "company_size", "quy mo", "nhan su", "so nhan vien", "so luong nhan vien",
      "employees", "size", "headcount", "lao dong", "quy mo dn", "so don", "so luong", "sl", "don hang", "quantity", "orders"
    ],
    need_description: [
      "need_description", "nhu cau", "noi dung", "yeu cau", "mo ta", "san pham quan tam",
      "ghi chu", "need", "requirement", "notes", "mo ta nhu cau", "san pham", "mat hang",
      "hang hoa", "dich vu", "chi tiet", "thong tin", "quan tam", "yeu cau tu van", "noi dung yeu cau", "description", "item",
      "ten san pham", "ten sp", "ten hang", "danh muc", "loai hang", "product name", "item name", "title", "tieu de", "vat tu"
    ],
    budget_vnd: [
      "budget_vnd", "ngan sach", "budget", "kinh phi", "du kien chi", "ngan sach du kien",
      "gia tri", "chi phi", "so tien", "gia", "doanh thu", "doanh so", "revenue", "tong tien", "thanh tien", "doanh thu vnd",
      "don gia", "tong cong", "tien", "tien ban", "tong gia tri", "amount"
    ],
    timeline: ["timeline", "thoi han", "thoi gian trien khai", "du kien trien khai", "deadline", "muc do gap", "tien do", "ke hoach"]
  };

  function normHeaderToken(text) {
    return stripAccents(text)
      .replace(/[*()[\]{}:;,./\\#?!%&@^~`'"+=<>-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectColumnMapping(headers, sampleRecords) {
    var mapping = {};
    var usedCols = {};
    var normalizedHeaders = (headers || []).map(function (h) {
      return { original: h, norm: normHeaderToken(h) };
    });

    var fields = Object.keys(FIELD_SYNONYMS);

    // Pass 1: Exact normalized match
    for (var f = 0; f < fields.length; f++) {
      var field = fields[f];
      var synonyms = FIELD_SYNONYMS[field];
      for (var s = 0; s < synonyms.length; s++) {
        var synNorm = normHeaderToken(synonyms[s]);
        if (!synNorm) continue;
        for (var h = 0; h < normalizedHeaders.length; h++) {
          if (usedCols[normalizedHeaders[h].original]) continue;
          if (normalizedHeaders[h].norm === synNorm) {
            mapping[field] = normalizedHeaders[h].original;
            usedCols[normalizedHeaders[h].original] = true;
            break;
          }
        }
        if (mapping[field]) break;
      }
    }

    // Pass 2: Substring fallback for remaining fields on unused columns
    for (var f2 = 0; f2 < fields.length; f2++) {
      var field2 = fields[f2];
      if (mapping[field2]) continue;
      var syns2 = FIELD_SYNONYMS[field2];
      var bestCol = "";
      var bestScore = 0;

      for (var h2 = 0; h2 < normalizedHeaders.length; h2++) {
        var headerNorm = normalizedHeaders[h2].norm;
        if (!headerNorm || usedCols[normalizedHeaders[h2].original]) continue;
        for (var s2 = 0; s2 < syns2.length; s2++) {
          var synNorm2 = normHeaderToken(syns2[s2]);
          if (!synNorm2 || synNorm2 === "name" || synNorm2 === "id" || synNorm2 === "ma" || synNorm2 === "gia" || synNorm2 === "dong") continue;
          if (headerNorm.indexOf(synNorm2) !== -1 || synNorm2.indexOf(headerNorm) !== -1) {
            var score = 60 + synNorm2.length;
            if (score > bestScore) {
              bestScore = score;
              bestCol = normalizedHeaders[h2].original;
            }
          }
        }
      }
      if (bestCol) {
        mapping[field2] = bestCol;
        usedCols[bestCol] = true;
      }
    }

    // Pass 2.5: Sample record inspection (detect email, phone, tax_id by pattern)
    if (sampleRecords && sampleRecords.length > 0) {
      var checkRows = sampleRecords.slice(0, 10);
      (headers || []).forEach(function (h) {
        if (usedCols[h]) return;
        var hasEmail = false;
        var hasPhone = false;
        var hasTaxId = false;

        for (var r = 0; r < checkRows.length; r++) {
          var v = String(checkRows[r][h] || "").trim();
          if (!v) continue;
          if (!mapping.email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) hasEmail = true;
          if (!mapping.phone && /^(\+84|0)[1-9]\d{7,9}$/.test(v.replace(/[\s.-]/g, ""))) hasPhone = true;
          if (!mapping.tax_id && /^\d{10}(-\d{3})?$/.test(v)) hasTaxId = true;
        }

        if (hasEmail && !mapping.email) {
          mapping.email = h;
          usedCols[h] = true;
        } else if (hasPhone && !mapping.phone) {
          mapping.phone = h;
          usedCols[h] = true;
        } else if (hasTaxId && !mapping.tax_id) {
          mapping.tax_id = h;
          usedCols[h] = true;
        }
      });
    }

    // Pass 3: Smart Fallback - ensure company_name and need_description are mapped to meaningful columns
    var unused = (headers || []).filter(function (h) { return !usedCols[h]; });

    if (!mapping.company_name) {
      if (mapping.lead_id) {
        mapping.company_name = mapping.lead_id;
      } else if (unused.length > 0) {
        mapping.company_name = unused.shift();
        usedCols[mapping.company_name] = true;
      } else if (headers && headers.length > 0) {
        mapping.company_name = headers[0];
      }
    }

    if (!mapping.need_description && unused.length > 0) {
      mapping.need_description = unused.shift();
      usedCols[mapping.need_description] = true;
    }

    return mapping;
  }

  function parseVietnameseBudget(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return isNaN(raw) ? null : raw;
    var s = stripAccents(String(raw)).replace(/\s+/g, " ").trim();
    if (!s || s === "-" || s === "chua ro" || s === "n/a") return null;

    var numMatch = /([\d.,]+)/.exec(s);
    if (!numMatch) return null;
    var numStr = numMatch[1];

    if (/ty/.test(s)) {
      var valTy = parseFloat(numStr.replace(/,/g, "."));
      return isNaN(valTy) ? null : Math.round(valTy * 1000000000);
    }
    if (/trieu|\btr\b/.test(s)) {
      var valTr = parseFloat(numStr.replace(/,/g, "."));
      return isNaN(valTr) ? null : Math.round(valTr * 1000000);
    }
    var digitsOnly = parseFloat(numStr.replace(/[.,](?=\d{3}(\D|$))/g, "").replace(/,/g, "."));
    if (isNaN(digitsOnly)) return null;
    if (digitsOnly > 0 && digitsOnly < 5000) {
      return Math.round(digitsOnly * 1000000);
    }
    return Math.round(digitsOnly);
  }

  function parseCompanySize(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return isNaN(raw) ? null : Math.round(raw);
    var m = /(\d+)/.exec(String(raw).replace(/[.,]/g, ""));
    return m ? parseInt(m[1], 10) : null;
  }

  function inferRegionFromText(_str, _rowIndex) {
    // KHÔNG tự ý suy diễn hoặc phát sinh Miền Bắc / Miền Trung / Miền Nam nếu file gốc không có cột khu vực!
    return "";
  }

  function mapRecordsToLeads(records, mapping) {
    if (!records || records.length === 0) return [];
    var leads = [];
    var m = mapping || {};

    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      if (!rec) continue;

      function get(field) {
        var col = m[field];
        if (col && rec[col] !== undefined && rec[col] !== null) {
          return String(rec[col]).trim();
        }
        return "";
      }

      var allKeys = Object.keys(rec);
      var allValues = allKeys
        .map(function (k) { return String(rec[k] || "").trim(); })
        .filter(function (v) { return v.length > 0; });

      // If row has no data at all, skip blank line
      if (allValues.length === 0) {
        continue;
      }

      var leadId = get("lead_id");
      var companyName = get("company_name");
      var needDesc = get("need_description");
      var email = get("email");
      var phone = get("phone");
      var contactName = get("contact_name");
      var contactRole = get("contact_role");
      var region = get("region");
      var source = get("source");
      var industry = get("industry");
      var budget = parseVietnameseBudget(get("budget_vnd"));
      var size = parseCompanySize(get("company_size"));
      var timeline = get("timeline");

      // Heuristic fallback với stripAccents để khớp mọi biến thể tên cột tiếng Việt có dấu:
      if (!companyName) {
        for (var k = 0; k < allKeys.length; k++) {
          var kNorm = stripAccents(allKeys[k] || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
          if (/cong ty|doanh nghiep|khach hang|don vi|doi tac|customer|company|client|name|ho ten|ma kh|nguoi mua|buyer|ten kh|ten khach|khach/.test(kNorm)) {
            var valComp = String(rec[allKeys[k]] || "").trim();
            if (valComp) { companyName = valComp; break; }
          }
        }
      }

      if (!needDesc) {
        for (var k2 = 0; k2 < allKeys.length; k2++) {
          var kNorm2 = stripAccents(allKeys[k2] || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
          if (kNorm2.indexOf("khach") !== -1 || kNorm2.indexOf("customer") !== -1 || kNorm2.indexOf("client") !== -1) continue;
          if (/san pham|mat hang|hang hoa|dich vu|noi dung|nhu cau|product|item|description|mo ta|title|tieu de|vat tu|ten hang|mon hang|loai hang|sku/.test(kNorm2)) {
            var valNeed = String(rec[allKeys[k2]] || "").trim();
            if (valNeed && valNeed !== companyName) { needDesc = valNeed; break; }
          }
        }
      }

      if (!budget || budget <= 0) {
        for (var k3 = 0; k3 < allKeys.length; k3++) {
          var kNorm3 = stripAccents(allKeys[k3] || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
          if (/doanh thu|doanh so|thanh tien|tong tien|so tien|ngan sach|gia tri|revenue|amount|total|price|gia|tien|tien ban|tong/.test(kNorm3)) {
            var valParsed = parseVietnameseBudget(rec[allKeys[k3]]);
            if (valParsed && valParsed > 0) {
              budget = valParsed;
              break;
            }
          }
        }
      }

      if (!region) {
        for (var k4 = 0; k4 < allKeys.length; k4++) {
          var kNorm4 = stripAccents(allKeys[k4] || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
          if (/khu vuc|tinh thanh|tinh|thanh pho|dia chi|mien|region|city|location|address|chi nhanh|branch|kho/.test(kNorm4)) {
            var valReg = String(rec[allKeys[k4]] || "").trim();
            if (valReg) { region = valReg; break; }
          }
        }
      }

      if (!source) {
        for (var k5 = 0; k5 < allKeys.length; k5++) {
          var kNorm5 = stripAccents(allKeys[k5] || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
          if (/kenh|nguon|channel|source|phuong thuc|campaign|platform/.test(kNorm5)) {
            var valSrc = String(rec[allKeys[k5]] || "").trim();
            if (valSrc) { source = valSrc; break; }
          }
        }
      }

      if (!leadId) {
        // Look for ID / code column in raw row
        for (var k6 = 0; k6 < allKeys.length; k6++) {
          var kNorm6 = stripAccents(allKeys[k6] || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
          if (/ma|code|id|stt|no|dong|don/.test(kNorm6)) {
            var valId = String(rec[allKeys[k6]] || "").trim();
            if (valId) { leadId = valId; break; }
          }
        }
        if (!leadId) leadId = "DS-" + String(i + 1).padStart(3, "0");
      }

      // Fallback: nếu vẫn chưa có tên công ty/khách, lấy cột văn bản đầu tiên không phải số
      if (!companyName) {
        for (var k7 = 0; k7 < allKeys.length; k7++) {
          var valText = String(rec[allKeys[k7]] || "").trim();
          if (valText && isNaN(Number(valText.replace(/[,. VNDvnd]/g, ""))) && valText !== needDesc) {
            companyName = valText;
            break;
          }
        }
        if (!companyName) companyName = leadId;
      }

      // Fallback: nếu vẫn chưa có sản phẩm/nhu cầu, lấy cột văn bản tiếp theo
      if (!needDesc) {
        for (var k8 = 0; k8 < allKeys.length; k8++) {
          var valProd = String(rec[allKeys[k8]] || "").trim();
          if (valProd && valProd !== companyName && isNaN(Number(valProd.replace(/[,. VNDvnd]/g, "")))) {
            needDesc = valProd;
            break;
          }
        }
        if (!needDesc) needDesc = "(Sản phẩm theo file)";
      }

      // KHÔNG tự động gán Miền Bắc/Trung/Nam nếu file không có cột khu vực
      leads.push({
        lead_id: leadId,
        created_at: get("created_at") || (rec["THÁNG"] || rec["Tháng"] || rec["Date"] || "2026-11-12"),
        source: source || "Trực tiếp",
        company_name: companyName,
        tax_id: get("tax_id") || "",
        contact_name: contactName || companyName,
        contact_role: contactRole || "Đại diện",
        email: email || "",
        phone: phone || "",
        region: region || "",
        industry: industry || "Thương mại & Bán lẻ",
        company_size: size || null,
        need_description: needDesc,
        budget_vnd: budget || 0,
        timeline: timeline || "Trong tháng",
        raw_record: rec
      });
    }
    return leads;
  }

  root.SpreadsheetIO = {
    utf8Encode: utf8Encode,
    utf8Decode: utf8Decode,
    decodeTextFromBuffer: decodeTextFromBuffer,
    stripAccents: stripAccents,
    inflateRawSync: inflateRawSync,
    unzipEntries: unzipEntries,
    zipStoreEntries: zipStoreEntries,
    parseCSV: parseCSV,
    toCSV: toCSV,
    parseXlsxArrayBuffer: parseXlsxArrayBuffer,
    buildXlsxUint8Array: buildXlsxUint8Array,
    parseGoogleSheetUrl: parseGoogleSheetUrl,
    fetchGoogleSheetTable: fetchGoogleSheetTable,
    detectColumnMapping: detectColumnMapping,
    parseVietnameseBudget: parseVietnameseBudget,
    parseCompanySize: parseCompanySize,
    mapRecordsToLeads: mapRecordsToLeads
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
