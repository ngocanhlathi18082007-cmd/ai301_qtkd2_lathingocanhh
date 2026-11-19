(function (root) {
  "use strict";

  var IO = root.SpreadsheetIO;
  function stripAccents(str) {
    if (IO && IO.stripAccents) return IO.stripAccents(str);
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  }

  function formatVnd(amount) {
    if (amount === null || amount === undefined || amount === "" || isNaN(amount)) {
      return "Chưa rõ";
    }
    var n = Number(amount);
    if (n >= 1000000000) {
      var ty = (n / 1000000000).toFixed(2).replace(/\.00$/, "");
      return ty + " tỷ đ";
    }
    if (n >= 1000000) {
      var tr = Math.round(n / 1000000);
      return tr.toLocaleString("en-US") + " triệu đ";
    }
    return n.toLocaleString("en-US") + " đ";
  }

  // =========================================================================
  // 1. Normalization & Alias Extraction (Chuẩn hóa & Lọc trùng Dữ liệu)
  // =========================================================================
  function normalizePhone(phone) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.indexOf("84") === 0 && digits.length >= 10) {
      digits = "0" + digits.slice(2);
    }
    return digits;
  }

  function extractEmailDomain(email, freeDomains) {
    var m = /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.exec(String(email || "").trim().toLowerCase());
    if (!m) return "";
    var domain = m[1];
    if (freeDomains && freeDomains.indexOf(domain) !== -1) return "";
    return domain;
  }

  function extractCompanyTokensAndAliases(rawName, rules) {
    var raw = String(rawName || "").trim();
    var parenMatches = [];
    var parenRe = /\(([^)]+)\)/g;
    var pm;
    while ((pm = parenRe.exec(raw)) !== null) {
      parenMatches.push(pm[1]);
    }
    var withoutParens = raw.replace(/\([^)]*\)/g, " ");
    var candidates = [withoutParens].concat(parenMatches);
    var legalPrefixes = (rules && rules.deduplication && rules.deduplication.legal_prefixes) || [];
    var descriptors = (rules && rules.deduplication && rules.deduplication.business_descriptors) || [];

    function cleanPart(text) {
      var s = " " + stripAccents(text).replace(/[.,/\\\-_&+]+/g, " ").replace(/\s+/g, " ").trim() + " ";
      var allStrip = legalPrefixes.concat(descriptors).map(stripAccents).sort(function (a, b) {
        return b.length - a.length;
      });
      for (var i = 0; i < allStrip.length; i++) {
        var term = allStrip[i];
        if (!term) continue;
        var re = new RegExp("(^|\\s)" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)", "g");
        s = s.replace(re, " ");
      }
      return s.replace(/\s+/g, " ").trim();
    }

    var coreTokensSet = {};
    var normalizedVariants = [];
    var generatedAcronyms = {};
    var explicitAcronyms = {};
    var ignoredUpper = { "TNHH": 1, "MTV": 1, "CP": 1, "CTY": 1, "JSC": 1, "CORP": 1, "LTD": 1, "TM": 1, "DV": 1, "TMDV": 1, "SX": 1, "XD": 1, "CN": 1, "TP": 1, "HCM": 1, "HN": 1 };

    // Extract explicit ALL-CAPS acronyms from original raw text (e.g. TV, DAL, MT)
    var upperRe = /\b([A-ZĐ]{2,5})\b/g;
    var um;
    while ((um = upperRe.exec(raw)) !== null) {
      if (!ignoredUpper[um[1]]) {
        explicitAcronyms[stripAccents(um[1])] = true;
      }
    }

    for (var c = 0; c < candidates.length; c++) {
      var cleaned = cleanPart(candidates[c]);
      if (!cleaned) continue;
      normalizedVariants.push(cleaned);
      var tokens = cleaned.split(" ").filter(function (t) { return t.length >= 1; });
      if (tokens.length >= 2) {
        var acr = tokens.map(function (t) { return t.charAt(0); }).join("");
        if (acr.length >= 2 && acr.length <= 5) {
          generatedAcronyms[acr] = true;
        }
      }
      for (var t = 0; t < tokens.length; t++) {
        if (tokens[t].length >= 2 || tokens.length <= 3) {
          coreTokensSet[tokens[t]] = true;
        }
      }
    }

    return {
      raw: raw,
      primary_core: normalizedVariants[0] || stripAccents(raw),
      variants: normalizedVariants,
      core_tokens: Object.keys(coreTokensSet),
      generated_acronyms: Object.keys(generatedAcronyms),
      explicit_acronyms: Object.keys(explicitAcronyms)
    };
  }

  function computeCompanyMatch(aMeta, bMeta) {
    // 1. Exact Tax ID
    if (aMeta.tax_id && bMeta.tax_id && aMeta.tax_id === bMeta.tax_id) {
      return { matched: true, confidence: 1.0, reason: "Trùng Mã số thuế (" + aMeta.tax_id + ")" };
    }
    // 2. Corporate Email Domain
    if (aMeta.domain && bMeta.domain && aMeta.domain === bMeta.domain) {
      return { matched: true, confidence: 0.96, reason: "Trùng domain email doanh nghiệp (@" + aMeta.domain + ")" };
    }
    // 3. Normalized Phone
    if (aMeta.phone && bMeta.phone && aMeta.phone === bMeta.phone) {
      return { matched: true, confidence: 0.95, reason: "Trùng số điện thoại (" + aMeta.phone + ")" };
    }
    // 4. Variant exact match
    for (var i = 0; i < aMeta.name_info.variants.length; i++) {
      var va = aMeta.name_info.variants[i];
      if (!va || va.length < 3) continue;
      for (var j = 0; j < bMeta.name_info.variants.length; j++) {
        var vb = bMeta.name_info.variants[j];
        if (!vb || vb.length < 3) continue;
        if (va === vb) {
          return { matched: true, confidence: 0.92, reason: "Trùng tên chuẩn hóa / alias (\"" + va + "\")" };
        }
      }
    }
    // 5. Token Jaccard similarity on core brand tokens
    var tA = aMeta.name_info.core_tokens;
    var tB = bMeta.name_info.core_tokens;
    if (tA.length > 0 && tB.length > 0) {
      var inter = 0;
      var unionSet = {};
      for (var x = 0; x < tA.length; x++) unionSet[tA[x]] = true;
      for (var y = 0; y < tB.length; y++) {
        if (unionSet[tB[y]]) inter++;
        unionSet[tB[y]] = true;
      }
      var unionCount = Object.keys(unionSet).length;
      var jaccard = unionCount > 0 ? inter / unionCount : 0;
      if (jaccard >= 0.72 && inter >= 2) {
        return { matched: true, confidence: 0.85, reason: "Khớp tên doanh nghiệp/viết tắt (" + Math.round(jaccard * 100) + "%)" };
      }
    }
    // 6. Explicit uppercase acronym (e.g. "DAL", "TV") matching generated brand acronym in same region (and same industry for 2-letter acronyms)
    var sameRegion = !aMeta.region_norm || !bMeta.region_norm || aMeta.region_norm === bMeta.region_norm;
    var sameIndustry = aMeta.industry_norm && bMeta.industry_norm && aMeta.industry_norm === bMeta.industry_norm;
    if (sameRegion) {
      var expAInGenB = aMeta.name_info.explicit_acronyms.some(function (ac) {
        return (ac.length >= 3 || sameIndustry) && bMeta.name_info.generated_acronyms.indexOf(ac) !== -1;
      });
      var expBInGenA = bMeta.name_info.explicit_acronyms.some(function (ac) {
        return (ac.length >= 3 || sameIndustry) && aMeta.name_info.generated_acronyms.indexOf(ac) !== -1;
      });
      if (expAInGenB || expBInGenA) {
        return { matched: true, confidence: 0.82, reason: "Khớp tên viết tắt (Acronym) cùng khu vực" };
      }
    }
    return { matched: false, confidence: 0, reason: "" };
  }

  function canonicalRegion(region) {
    var r = stripAccents(region).replace(/\./g, " ").replace(/\s+/g, " ").trim();
    if (!r) return "";
    if (/^(tp\s*)?(ho chi minh|hcm|sai gon)$/.test(r)) return "TP.HCM";
    if (/^(tp\s*)?(ha noi|hn)$/.test(r)) return "Hà Nội";
    if (/^(tp\s*)?(da nang|dn)$/.test(r)) return "Đà Nẵng";
    if (/^(tp\s*)?(can tho|ct)$/.test(r)) return "Cần Thơ";
    if (/^(tp\s*)?(hai phong|hp)$/.test(r)) return "Hải Phòng";
    return String(region || "").trim();
  }

  function buildLeadMeta(lead, rules) {
    var freeDomains = (rules && rules.deduplication && rules.deduplication.free_email_domains) || [];
    return {
      lead: lead,
      tax_id: String(lead.tax_id || "").replace(/\D/g, ""),
      domain: extractEmailDomain(lead.email, freeDomains),
      phone: normalizePhone(lead.phone),
      region_norm: stripAccents(canonicalRegion(lead.region)),
      industry_norm: stripAccents(lead.industry),
      name_info: extractCompanyTokensAndAliases(lead.company_name, rules)
    };
  }

  function buildHistoryMeta(hist, rules) {
    var freeDomains = (rules && rules.deduplication && rules.deduplication.free_email_domains) || [];
    var variants = [];
    var tokensSet = {};
    var genAcronyms = {};
    var expAcronyms = {};
    var allNames = [hist.company_name].concat(hist.aliases || []);
    for (var i = 0; i < allNames.length; i++) {
      var info = extractCompanyTokensAndAliases(allNames[i], rules);
      for (var v = 0; v < info.variants.length; v++) variants.push(info.variants[v]);
      for (var t = 0; t < info.core_tokens.length; t++) tokensSet[info.core_tokens[t]] = true;
      for (var ga = 0; ga < info.generated_acronyms.length; ga++) genAcronyms[info.generated_acronyms[ga]] = true;
      for (var ea = 0; ea < info.explicit_acronyms.length; ea++) expAcronyms[info.explicit_acronyms[ea]] = true;
    }
    return {
      history: hist,
      tax_id: String(hist.tax_id || "").replace(/\D/g, ""),
      domain: String(hist.domain || "").toLowerCase().trim() || extractEmailDomain(hist.email, freeDomains),
      phone: normalizePhone(hist.phone),
      region_norm: stripAccents(hist.region),
      industry_norm: stripAccents(hist.industry),
      name_info: {
        primary_core: variants[0] || "",
        variants: variants,
        core_tokens: Object.keys(tokensSet),
        generated_acronyms: Object.keys(genAcronyms),
        explicit_acronyms: Object.keys(expAcronyms)
      }
    };
  }

  // =========================================================================
  // 2. Entity Clustering (Union-Find) & Contact History Matching
  // =========================================================================
  function clusterLeads(rawLeads, contactHistory, rules) {
    var metas = rawLeads.map(function (l) { return buildLeadMeta(l, rules); });
    var n = metas.length;
    var parent = [];
    for (var i = 0; i < n; i++) parent[i] = i;

    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }

    function union(a, b) {
      var ra = find(a);
      var rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    }

    var matchReasonsByIndex = {};
    for (var idx = 0; idx < n; idx++) matchReasonsByIndex[idx] = [];

    // Lossless inverted index: only pairs sharing >= 1 identifier, variant, token, or acronym can match
    var buckets = {};
    function addToBucket(key, index) {
      if (!key) return;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(index);
    }

    for (var bIdx = 0; bIdx < n; bIdx++) {
      var m = metas[bIdx];
      if (m.tax_id) addToBucket("tax:" + m.tax_id, bIdx);
      if (m.domain) addToBucket("dom:" + m.domain, bIdx);
      if (m.phone) addToBucket("ph:" + m.phone, bIdx);
      for (var vi = 0; vi < m.name_info.variants.length; vi++) {
        if (m.name_info.variants[vi].length >= 3) addToBucket("var:" + m.name_info.variants[vi], bIdx);
      }
      for (var ti = 0; ti < m.name_info.core_tokens.length; ti++) {
        addToBucket("tok:" + m.name_info.core_tokens[ti], bIdx);
      }
      for (var ga = 0; ga < m.name_info.generated_acronyms.length; ga++) {
        addToBucket("acr:" + m.name_info.generated_acronyms[ga], bIdx);
      }
      for (var ea = 0; ea < m.name_info.explicit_acronyms.length; ea++) {
        addToBucket("acr:" + m.name_info.explicit_acronyms[ea], bIdx);
      }
    }

    var testedPairs = {};
    var bucketKeys = Object.keys(buckets);
    for (var bk = 0; bk < bucketKeys.length; bk++) {
      var list = buckets[bucketKeys[bk]];
      if (list.length < 2) continue;
      for (var p1 = 0; p1 < list.length; p1++) {
        for (var p2 = p1 + 1; p2 < list.length; p2++) {
          var aIdx = list[p1];
          var bIdx2 = list[p2];
          var pairKey = aIdx < bIdx2 ? aIdx + ":" + bIdx2 : bIdx2 + ":" + aIdx;
          if (testedPairs[pairKey]) continue;
          testedPairs[pairKey] = true;

          var res = computeCompanyMatch(metas[aIdx], metas[bIdx2]);
          if (res.matched) {
            union(aIdx, bIdx2);
            matchReasonsByIndex[aIdx].push(res.reason);
            matchReasonsByIndex[bIdx2].push(res.reason);
          }
        }
      }
    }

    var groupsMap = {};
    var groupOrder = [];
    for (var k = 0; k < n; k++) {
      var rootId = find(k);
      if (!groupsMap[rootId]) {
        groupsMap[rootId] = [];
        groupOrder.push(rootId);
      }
      groupsMap[rootId].push({ meta: metas[k], reasons: matchReasonsByIndex[k] });
    }

    var historyMetas = ((contactHistory && contactHistory.records) || []).map(function (h) {
      return buildHistoryMeta(h, rules);
    });

    var clusters = [];
    for (var g = 0; g < groupOrder.length; g++) {
      var items = groupsMap[groupOrder[g]];
      var merged = mergeClusterItems(g + 1, items, historyMetas);
      clusters.push(merged);
    }
    return clusters;
  }

  function pickCanonicalCompanyName(items) {
    // Choose the longest formal Vietnamese company name (preferring "Công ty")
    var best = items[0].meta.lead.company_name || "Chưa rõ tên DN";
    var bestScore = -1;
    for (var i = 0; i < items.length; i++) {
      var name = String(items[i].meta.lead.company_name || "").trim();
      var sc = name.length;
      if (/^công ty/i.test(name)) sc += 30;
      if (/tnhh|cổ phần|cp\b/i.test(name)) sc += 15;
      if (/^dn từ domain/i.test(name)) sc -= 50;
      if (sc > bestScore) {
        bestScore = sc;
        best = name;
      }
    }
    return best;
  }

  function mergeClusterItems(seqNum, items, historyMetas) {
    var canonicalName = pickCanonicalCompanyName(items);
    var aliases = [];
    var aliasSet = {};
    var sources = [];
    var sourceSet = {};
    var regions = [];
    var regionSet = {};
    var industries = [];
    var industrySet = {};
    var contacts = [];
    var needsList = [];
    var timelines = [];
    var maxBudget = null;
    var maxSize = null;
    var taxId = "";
    var domain = "";
    var dedupReasons = [];
    var dedupReasonSet = {};

    for (var i = 0; i < items.length; i++) {
      var l = items[i].meta.lead;
      if (l.company_name && !aliasSet[l.company_name]) {
        aliasSet[l.company_name] = true;
        aliases.push(l.company_name);
      }
      if (l.source && !sourceSet[l.source]) {
        sourceSet[l.source] = true;
        sources.push(l.source);
      }
      if (l.region) {
        var canonReg = canonicalRegion(l.region);
        var rKey = stripAccents(canonReg);
        if (rKey && !regionSet[rKey]) {
          regionSet[rKey] = true;
          regions.push(canonReg);
        }
      }
      if (l.industry) {
        var indKey = stripAccents(l.industry);
        if (!industrySet[indKey]) {
          industrySet[indKey] = true;
          industries.push(l.industry);
        }
      }
      if (!taxId && items[i].meta.tax_id) taxId = items[i].meta.tax_id;
      if (!domain && items[i].meta.domain) domain = items[i].meta.domain;
      if (l.budget_vnd !== null && l.budget_vnd !== undefined && l.budget_vnd !== "" && !isNaN(Number(l.budget_vnd))) {
        var bVal = Number(l.budget_vnd);
        if (maxBudget === null || bVal > maxBudget) maxBudget = bVal;
      }
      if (l.company_size !== null && l.company_size !== undefined && l.company_size !== "" && !isNaN(Number(l.company_size))) {
        var sVal = Number(l.company_size);
        if (maxSize === null || sVal > maxSize) maxSize = sVal;
      }
      if (l.need_description) {
        needsList.push("[" + (l.source || "Form") + " - " + (l.contact_name || "N/A") + "]: " + l.need_description);
      }
      if (l.timeline && timelines.indexOf(l.timeline) === -1) {
        timelines.push(l.timeline);
      }
      contacts.push({
        lead_id: l.lead_id,
        contact_name: l.contact_name || "Chưa rõ",
        contact_role: l.contact_role || "",
        email: l.email || "",
        phone: l.phone || "",
        source: l.source || "",
        created_at: l.created_at || ""
      });
      for (var r = 0; r < items[i].reasons.length; r++) {
        var reason = items[i].reasons[r];
        if (!dedupReasonSet[reason]) {
          dedupReasonSet[reason] = true;
          dedupReasons.push(reason);
        }
      }
    }

    // Match against contact history
    var matchedHistory = null;
    var historyMatchReason = "";
    for (var h = 0; h < historyMetas.length; h++) {
      var hm = historyMetas[h];
      for (var m = 0; m < items.length; m++) {
        var res = computeCompanyMatch(items[m].meta, hm);
        if (res.matched) {
          matchedHistory = hm.history;
          historyMatchReason = res.reason;
          break;
        }
      }
      if (matchedHistory) break;
    }

    if (matchedHistory) {
      if (!canonicalName || /^dn từ domain/i.test(canonicalName)) {
        canonicalName = matchedHistory.company_name;
      }
      if (regions.length === 0 && matchedHistory.region) regions.push(matchedHistory.region);
      if (industries.length === 0 && matchedHistory.industry) industries.push(matchedHistory.industry);
      if (matchedHistory.company_name && !aliasSet[matchedHistory.company_name]) {
        aliases.push(matchedHistory.company_name);
      }
    }

    // Flowchart Bước 1 Decision: Check contact history / explicit opt-out -> DNC
    var dncReason = "";
    var histNorm = matchedHistory
      ? stripAccents((matchedHistory.stage || "") + " " + (matchedHistory.notes || ""))
      : "";
    var leadTextNorm = stripAccents(needsList.join(" "));
    if (matchedHistory && (matchedHistory.dnc_flag || /\bdnc\b|khong lien he lai|tu choi tiep nhan|da chot/.test(histNorm))) {
      dncReason = "Lịch sử CRM (" + matchedHistory.history_id + "): " + (matchedHistory.notes || matchedHistory.stage);
    } else if (/ngung lien he|khong lien he lai|huy nhan tin|do not contact|\bdnc\b|khong lam phien/.test(leadTextNorm)) {
      dncReason = "Khách hàng yêu cầu ngừng liên hệ (DNC) trong nội dung đăng ký.";
    }

    return {
      cluster_id: "CL-" + String(seqNum).padStart(3, "0"),
      company_name: canonicalName,
      aliases: aliases,
      is_duplicate_cluster: items.length > 1 || !!matchedHistory,
      raw_record_count: items.length,
      dedup_reasons: dedupReasons,
      tax_id: taxId,
      domain: domain,
      sources: sources,
      regions: regions,
      primary_region: regions[0] || "",
      industries: industries,
      primary_industry: industries[0] || "",
      company_size: maxSize,
      budget_vnd: maxBudget,
      timeline: timelines.join(" | "),
      contacts: contacts,
      combined_need: needsList.join("\n"),
      matched_history: matchedHistory,
      history_match_reason: historyMatchReason,
      is_dnc: !!dncReason,
      dnc_reason: dncReason,
      raw_leads: items.map(function (it) { return it.meta.lead; })
    };
  }

  // =========================================================================
  // 3. Product Fit, Out-of-Scope & Completeness Check (Kiểm tra Chân dung mục tiêu)
  // =========================================================================
  function analyzeProductAndCompleteness(cluster, catalog, rules) {
    var text = stripAccents(cluster.combined_need + " " + cluster.primary_industry + " " + cluster.company_name);

    // Check Out-of-Scope (anti-ICP trap: big budget wrong product)
    var oosPatterns = catalog.out_of_scope_patterns || [];
    var oosMatched = null;
    for (var o = 0; o < oosPatterns.length; o++) {
      var pat = oosPatterns[o];
      var hitKeywords = [];
      for (var k = 0; k < pat.keywords.length; k++) {
        if (text.indexOf(stripAccents(pat.keywords[k])) !== -1) {
          hitKeywords.push(pat.keywords[k]);
        }
      }
      if (hitKeywords.length > 0) {
        oosMatched = {
          pattern_id: pat.pattern_id,
          label: pat.label,
          reason: pat.reason,
          matched_keywords: hitKeywords
        };
        break;
      }
    }

    // Match Nam Việt products or preserve exact product from file
    var matchedProducts = [];
    var products = catalog.products || [];
    var rawProd = "";
    if (cluster.raw_leads && cluster.raw_leads.length > 0 && cluster.raw_leads[0].need_description) {
      rawProd = String(cluster.raw_leads[0].need_description || "").trim();
    } else {
      rawProd = String(cluster.combined_need || "").split("\n")[0].trim();
      rawProd = rawProd.replace(/^\[.*?\]:\s*/, "").trim();
    }
    var needNorm = stripAccents(rawProd).toLowerCase();

    var primaryProductCode = rawProd || "Sản phẩm kinh doanh";
    var primaryProductName = rawProd || "Sản phẩm kinh doanh";

    // If it specifically matches known Nam Việt software modules:
    if (/erp|tong the|suite|hop nhat/.test(needNorm)) {
      primaryProductCode = "ERP Tổng thể";
      primaryProductName = "ERP Tổng thể (NamViet Suite)";
      matchedProducts.push({ code: "NV-SUITE", name: primaryProductName });
    } else if (/\bcrm\b|cskh|pipeline/.test(needNorm) || (needNorm.indexOf("crm") !== -1 && needNorm.indexOf("ban hang") !== -1)) {
      primaryProductCode = "CRM Bán hàng";
      primaryProductName = "CRM Bán hàng (NamViet CRM)";
      matchedProducts.push({ code: "NV-CRM", name: primaryProductName });
    } else if (/ke toan|hoa don|tai chinh|finacc/.test(needNorm)) {
      primaryProductCode = "Kế toán & Hóa đơn";
      primaryProductName = "Kế toán & Hóa đơn (NamViet FinAcc)";
      matchedProducts.push({ code: "NV-ACC", name: primaryProductName });
    } else if (/nhan su|hrm|cham cong|tinh luong/.test(needNorm)) {
      primaryProductCode = "Chấm công & Nhân sự";
      primaryProductName = "Chấm công & Nhân sự (NamViet HRM)";
      matchedProducts.push({ code: "NV-HRM", name: primaryProductName });
    } else if (/quan ly kho|ton kho|xuat nhap ton/.test(needNorm)) {
      primaryProductCode = "Quản lý Kho";
      primaryProductName = "Quản lý Kho (NamViet Inventory)";
      matchedProducts.push({ code: "NV-INV", name: primaryProductName });
    } else if (rawProd) {
      // It's a real physical / retail / commercial product from the file (e.g. Áo thun, Sơ mi, Quần tây, Váy đầm, Áo khoác...)
      primaryProductCode = rawProd;
      primaryProductName = rawProd;
      matchedProducts.push({ code: rawProd, name: rawProd });
    }

    // Completeness check (including decision maker role per Bước 2 of workflow)
    var missingFields = [];
    if (!cluster.primary_region) missingFields.push("Khu vực / Tỉnh thành");
    if (!cluster.primary_industry) missingFields.push("Ngành nghề kinh doanh");
    if (!cluster.company_size) missingFields.push("Quy mô nhân sự");
    if (!cluster.budget_vnd) missingFields.push("Ngân sách dự kiến");
    if (!cluster.timeline) missingFields.push("Thời gian dự kiến triển khai");
    var hasDecisionMaker = cluster.contacts.some(function (c) { return !!String(c.contact_role || "").trim(); });
    if (!hasDecisionMaker) missingFields.push("Người ra quyết định / Chức vụ");
    var hasEmailOrPhone = cluster.contacts.some(function (c) { return c.email || c.phone; });
    if (!hasEmailOrPhone) missingFields.push("Thông tin liên hệ (Email/SĐT)");

    var needTextLen = stripAccents(cluster.raw_leads.map(function (r) { return r.need_description || ""; }).join(" ")).length;
    var isGenericNeed = matchedProducts.length === 0 && !oosMatched && !cluster.is_dnc && needTextLen > 0;
    if (isGenericNeed) {
      missingFields.push("Phân hệ phần mềm cụ thể (Kế toán / CRM / Kho / Nhân sự)");
    }

    var totalCheckPoints = 8;
    var completenessPct = Math.max(0, Math.round(((totalCheckPoints - missingFields.length) / totalCheckPoints) * 100));

    // Determine ICP & Completeness gate outcomes matching the workflow diagram
    var isOutOfScope = !!oosMatched;
    var smeMin = 10;
    var smeMax = 500;
    var sizeOutsideSme = cluster.company_size !== null && (cluster.company_size < 6 || cluster.company_size > 800);

    var icpStatus = "FIT";
    var icpReason = "";

    if (cluster.is_dnc) {
      icpStatus = "DNC_BLOCKED";
      icpReason = cluster.dnc_reason;
      isOutOfScope = true;
    } else if (isOutOfScope) {
      icpStatus = "OUT_OF_SCOPE";
      icpReason = oosMatched.reason;
    } else if (sizeOutsideSme && cluster.company_size < 6 && (cluster.budget_vnd !== null && cluster.budget_vnd < 10000000)) {
      icpStatus = "OUT_OF_SCOPE";
      icpReason = "Quy mô siêu nhỏ (" + cluster.company_size + " người) & ngân sách thấp (" + formatVnd(cluster.budget_vnd) + ") không phù hợp gói B2B SME.";
    } else if (sizeOutsideSme && cluster.company_size > 800 && matchedProducts.length === 0) {
      icpStatus = "OUT_OF_SCOPE";
      icpReason = "Quy mô Enterprise quá lớn (" + cluster.company_size + " nhân sự) vượt phân khúc SME.";
    } else if (matchedProducts.length === 0 && !explicitSuite) {
      icpStatus = "FIT";
      icpReason = "Sản phẩm / Mặt hàng thực tế trong tệp tin: " + primaryProductCode;
    } else if (missingFields.length >= 2) {
      icpStatus = "FIT_INCOMPLETE";
      icpReason = "Đã khớp sản phẩm (" + primaryProductCode + ") nhưng thiếu " + missingFields.length + " thông tin để lên báo giá chuẩn.";
    } else {
      icpStatus = "FIT_COMPLETE";
      icpReason = "Hồ sơ đầy đủ và khớp chân dung khách hàng SME mục tiêu (" + primaryProductCode + ").";
    }

    var isSufficient = !isOutOfScope && matchedProducts.length > 0 && missingFields.length <= 1;
    var needsEnrichmentDraft = !isOutOfScope && (missingFields.length >= 2 || isGenericNeed);

    return {
      is_out_of_scope: isOutOfScope,
      oos_detail: oosMatched,
      matched_products: matchedProducts,
      primary_product_code: primaryProductCode || "CHƯA XÁC ĐỊNH",
      primary_product_name: primaryProductName || "Cần khai thác thêm phân hệ",
      missing_fields: missingFields,
      completeness_pct: completenessPct,
      is_sufficient: isSufficient,
      needs_enrichment_draft: needsEnrichmentDraft,
      icp_status: icpStatus,
      icp_reason: icpReason,
      sme_fit_flag: !isOutOfScope && (!cluster.company_size || (cluster.company_size >= smeMin && cluster.company_size <= smeMax))
    };
  }

  // =========================================================================
  // 4. Lead Priority Scoring (0-100) - Anti Big-Budget Trap
  // =========================================================================
  function scoreCluster(cluster, analysis, rules) {
    var breakdown = {
      product_fit: 0,
      icp_size_industry: 0,
      need_clarity_urgency: 0,
      completeness_trust: 0,
      budget_alignment: 0
    };

    // 1. Product Fit (0-40)
    if (analysis.is_out_of_scope) {
      breakdown.product_fit = 0;
    } else if (analysis.matched_products.length >= 2 || analysis.primary_product_code === "NV-SUITE") {
      breakdown.product_fit = 40;
    } else if (analysis.matched_products.length === 1) {
      breakdown.product_fit = 36;
    } else {
      breakdown.product_fit = 34; // Valid product from uploaded file
    }

    // 2. ICP Size & Industry (0-20)
    if (!analysis.is_out_of_scope) {
      var size = cluster.company_size;
      if (size !== null) {
        if (size >= 15 && size <= 350) breakdown.icp_size_industry += 14;
        else if (size >= 8 && size <= 500) breakdown.icp_size_industry += 10;
        else breakdown.icp_size_industry += 4;
      } else {
        breakdown.icp_size_industry += 8; // unknown size yet, don't heavily penalize
      }
      if (cluster.primary_industry) breakdown.icp_size_industry += 6;
    } else {
      breakdown.icp_size_industry = 4;
    }

    // 3. Need Clarity & Urgency (0-20)
    var textNorm = stripAccents(cluster.combined_need + " " + cluster.timeline);
    if (!analysis.is_out_of_scope) {
      if (analysis.matched_products.length > 0) breakdown.need_clarity_urgency += 8;
      if (/gap|ngay|thang 11|thang 12|tuan sau|2 tuan|3 tuan|quy 4|demo|chot/.test(textNorm)) {
        breakdown.need_clarity_urgency += 8;
      } else if (cluster.timeline) {
        breakdown.need_clarity_urgency += 4;
      }
      if (cluster.sources.indexOf("Hội thảo") !== -1 || cluster.sources.indexOf("Website") !== -1) {
        breakdown.need_clarity_urgency += 4;
      }
    }

    // 4. Completeness & Contact Trust (0-10)
    breakdown.completeness_trust = Math.round((analysis.completeness_pct / 100) * 7);
    if (cluster.domain) breakdown.completeness_trust += 3;
    if (breakdown.completeness_trust > 10) breakdown.completeness_trust = 10;

    // 5. Budget Alignment (0-10) — ONLY awarded if Product Fit >= 18!
    if (breakdown.product_fit >= 18 && cluster.budget_vnd !== null) {
      if (cluster.budget_vnd >= 35000000 && cluster.budget_vnd <= 400000000) {
        breakdown.budget_alignment = 10;
      } else if (cluster.budget_vnd >= 15000000) {
        breakdown.budget_alignment = 7;
      } else {
        breakdown.budget_alignment = 2;
      }
    }

    var total = breakdown.product_fit +
      breakdown.icp_size_industry +
      breakdown.need_clarity_urgency +
      breakdown.completeness_trust +
      breakdown.budget_alignment;

    var cap = (rules && rules.scoring_weights && rules.scoring_weights.out_of_scope_cap_score) || 22;
    if (analysis.is_out_of_scope && total > cap) {
      total = cap;
    }

    var tier = "C";
    var tierLabel = "Thấp (Cold) — Cần khai thác bổ sung";
    var priorityLevel = "COLD";
    var priorityLabel = "Thấp (Cold)";
    var slaHours = 24;

    if (cluster.is_dnc) {
      total = 0;
      tier = "D";
      tierLabel = "Không liên hệ lại (DNC)";
      priorityLevel = "DNC";
      priorityLabel = "DNC (Ngừng liên hệ)";
      slaHours = 0;
    } else if (analysis.is_out_of_scope || total < 40) {
      tier = "D";
      tierLabel = "Không phù hợp / Tạm loại (Disqualified)";
      priorityLevel = "DISQUALIFIED";
      priorityLabel = "Thấp / Ngoài phạm vi (Loại)";
      slaHours = 0;
    } else if (total >= 80) {
      tier = "A";
      tierLabel = "Cao (Hot) — Ưu tiên Hạng A";
      priorityLevel = "HOT";
      priorityLabel = "Cao (Hot)";
      slaHours = 2;
    } else if (total >= 60) {
      tier = "B";
      tierLabel = "Trung bình (Warm) — Ưu tiên Hạng B";
      priorityLevel = "WARM";
      priorityLabel = "Trung bình (Warm)";
      slaHours = 4;
    }

    return {
      total_score: total,
      tier: tier,
      tier_label: tierLabel,
      priority_level: priorityLevel,
      priority_label: priorityLabel,
      sla_hours: slaHours,
      breakdown: breakdown,
      big_budget_trap_prevented: !cluster.is_dnc && analysis.is_out_of_scope && cluster.budget_vnd >= 300000000
    };
  }

  // =========================================================================
  // 5. Sales Rep Routing & Escalation Check (Bước 4: Đề xuất Sales & Ngoại lệ)
  // =========================================================================
  function routeClusterToSales(cluster, analysis, scoring, salesTeam, rules) {
    if (cluster.is_dnc) {
      return {
        proposed_rep: null,
        rep_candidates: [],
        unmatched_sales: false,
        routing_reason: "Chuyển thẳng vào Danh sách không liên hệ lại (DNC): " + cluster.dnc_reason,
        escalation_triggers: [],
        requires_manager_approval: false,
        manager_approval_status: "NOT_REQUIRED"
      };
    }

    if (scoring.tier === "D" && cluster.is_dnc) {
      return {
        proposed_rep: null,
        rep_candidates: [],
        unmatched_sales: false,
        routing_reason: "Không phân công NVKD vì hồ sơ thuộc danh sách chặn DNC/Opt-out (" + cluster.dnc_reason + ").",
        escalation_triggers: [],
        requires_manager_approval: false,
        manager_approval_status: "NOT_REQUIRED"
      };
    }

    var reps = (salesTeam && salesTeam.sales_reps) || [];
    var regionNorm = stripAccents(cluster.primary_region);
    var industryNorm = stripAccents(cluster.primary_industry);
    var prodCode = analysis.primary_product_code;

    var candidates = reps.map(function (rep) {
      var fitScore = 0;
      var reasons = [];

      // Region matching (+45)
      var regionMatched = false;
      if (regionNorm) {
        if (rep.region_aliases.some(function (a) { return regionNorm.indexOf(stripAccents(a)) !== -1 || stripAccents(a).indexOf(regionNorm) !== -1; })) {
          fitScore += 45;
          regionMatched = true;
          reasons.push("Phụ trách khu vực " + rep.region);
        }
      } else {
        fitScore += 15; // region unknown
      }

      // Industry matching (+30)
      var industryMatched = false;
      if (industryNorm) {
        industryMatched = rep.industries.some(function (ind) {
          var inorm = stripAccents(ind);
          return inorm === industryNorm || inorm.indexOf(industryNorm) !== -1 || industryNorm.indexOf(inorm) !== -1;
        });
        if (industryMatched) {
          fitScore += 30;
          reasons.push("Đúng nhóm ngành (" + cluster.primary_industry + ")");
        }
      }

      // Product focus (+15)
      if (prodCode && rep.product_focus.indexOf(prodCode) !== -1) {
        fitScore += 15;
        reasons.push("Thế mạnh " + prodCode);
      }

      // Multi-branch bonus for NVKD-08
      if (cluster.regions.length > 1 && rep.id === "NVKD-08") {
        fitScore += 25;
        reasons.push("Chuyên trách dự án đa chi nhánh");
      }

      // Workload balance (+10)
      var loadRatio = rep.weekly_capacity > 0 ? rep.current_active_leads / rep.weekly_capacity : 0.5;
      var loadScore = Math.max(0, Math.round((1 - loadRatio) * 10));
      fitScore += loadScore;

      return {
        rep: rep,
        fit_score: fitScore,
        region_matched: regionMatched,
        industry_matched: industryMatched,
        reasons: reasons,
        load_pct: Math.round(loadRatio * 100)
      };
    });

    candidates.sort(function (a, b) { return b.fit_score - a.fit_score; });
    var best = candidates[0] || null;
    var chosen = best ? best.rep : null;
    var routingReason = best ? best.reasons.join(" • ") : "";

    // Check "Không khớp Sales" branch from Flowchart (Bước 4)
    var isForeignRegion = /(singapore|nhat ban|japan|han quoc|korea|trung quoc|china|hoa ky|usa|nuoc ngoai|quoc te|thai lan|campuchia|lao\b)/.test(regionNorm);
    var hasRegionOrIndustry = !!regionNorm || !!industryNorm;
    var noRepMatches = !best || (!best.region_matched && !best.industry_matched && hasRegionOrIndustry);
    var isUnmatchedSales = !cluster.matched_history && (noRepMatches || (isForeignRegion && (!best || !best.region_matched)));

    if (isUnmatchedSales) {
      return {
        proposed_rep: null,
        rep_candidates: candidates.slice(0, 3),
        unmatched_sales: true,
        routing_reason: "Không có Sales nào trong 8 NVKD phụ trách khu vực (" + (cluster.primary_region || "Chưa rõ") + ") hoặc ngành (" + (cluster.primary_industry || "Chưa rõ") + ") — chuyển danh sách Khách chưa có người phù hợp.",
        escalation_triggers: [],
        requires_manager_approval: false,
        manager_approval_status: "NOT_REQUIRED"
      };
    }

    // Check contact history continuity & [HITL 1] escalation triggers
    var triggers = [];
    var hist = cluster.matched_history;
    var neglectedThreshold = (rules && rules.routing_and_escalation && rules.routing_and_escalation.neglected_threshold_days) || 7;
    var vipBudget = (rules && rules.routing_and_escalation && rules.routing_and_escalation.vip_budget_threshold_vnd) || 250000000;

    if (hist) {
      var histRep = reps.filter(function (r) { return r.id === hist.assigned_rep_id; })[0];
      if (hist.dispute_flag) {
        triggers.push({
          code: "ROUTING_DISPUTE",
          severity: "high",
          message: "Tranh chấp phân công trong lịch sử giữa " + hist.assigned_rep_name + " (" + hist.assigned_rep_id + ") và " + (hist.secondary_claim_rep_name || "NVKD khác") + "."
        });
      }
      if (hist.days_since_last_contact > neglectedThreshold) {
        triggers.push({
          code: "NEGLECTED_LEAD_ALERT",
          severity: "high",
          message: "Cơ hội bị bỏ quên " + hist.days_since_last_contact + " ngày (quá SLA " + neglectedThreshold + " ngày) bởi " + hist.assigned_rep_name + "."
        });
      }
      if (histRep) {
        if (chosen && chosen.id !== histRep.id && !hist.dispute_flag) {
          routingReason = "Giữ continuity theo Lịch sử liên hệ với " + histRep.name + " (" + hist.stage + ") — ngăn 2 NVKD gọi trùng.";
        } else if (!routingReason) {
          routingReason = "Theo lịch sử liên hệ: " + histRep.name;
        }
        chosen = histRep;
      }
    }

    if (cluster.regions.length > 1) {
      triggers.push({
        code: "MULTI_BRANCH_CONFLICT",
        severity: "medium",
        message: "Hồ sơ gộp có mặt tại nhiều khu vực (" + cluster.regions.join(", ") + ") cần thống nhất 1 đầu mối phụ trách."
      });
    }

    if (cluster.budget_vnd && cluster.budget_vnd >= vipBudget) {
      triggers.push({
        code: "VIP_BUDGET_ESCALATION",
        severity: "medium",
        message: "Ngân sách lớn (" + formatVnd(cluster.budget_vnd) + ") vượt ngưỡng chuẩn, Trưởng phòng cần giám sát tiến độ."
      });
    }

    var requiresManager = triggers.length > 0;

    return {
      proposed_rep: chosen,
      rep_candidates: candidates.slice(0, 3),
      unmatched_sales: false,
      routing_reason: routingReason || "Phân bổ theo khu vực, ngành nghề và cân bằng tải đội ngũ",
      escalation_triggers: triggers,
      requires_manager_approval: requiresManager,
      manager_approval_status: requiresManager ? "PENDING_APPROVAL" : "NOT_REQUIRED"
    };
  }

  // =========================================================================
  // 6. Bước 5: Next Action & Draft Composer (Email/Zalo hoặc Câu hỏi khai thác)
  // =========================================================================
  function buildNextAction(cluster, analysis, scoring, routing) {
    if (cluster.is_dnc) {
      return {
        code: "ARCHIVE_DNC",
        title: "Chuyển Danh sách Không liên hệ lại (DNC) — Không gửi tin",
        channel: "CRM DNC Blocklist",
        sla_deadline: "Không liên hệ",
        checklist: [
          "Khóa quyền gọi/gửi email hàng loạt trên CRM",
          "Lưu vết lý do DNC để tránh trùng lặp đợt sau"
        ]
      };
    }
    if (analysis.is_out_of_scope || scoring.tier === "D") {
      return {
        code: "REFERRAL_OR_CLOSE",
        title: "Gửi phản hồi từ chối lịch sự / Chặn khỏi hàng đợi Sales",
        channel: "Email tự động",
        sla_deadline: "Không ưu tiên Sales",
        checklist: [
          "Xác nhận ngoài phạm vi SME để bảo vệ thời gian 8 Sales",
          "Lưu vào danh sách ngoại lệ (Ngoài phạm vi)"
        ]
      };
    }
    if (routing.unmatched_sales) {
      return {
        code: "QUEUE_UNMATCHED_SALES",
        title: "Đưa vào danh sách Khách chưa có người phù hợp",
        channel: "Hàng đợi Ngoại lệ",
        sla_deadline: "Trưởng phòng rà soát bổ sung",
        checklist: [
          "Rà soát mở rộng vùng phủ / gán chéo NVKD đa chi nhánh",
          "Không giao nhầm người không đúng ngành/khu vực"
        ]
      };
    }
    if (routing.requires_manager_approval) {
      return {
        code: "WAIT_HITL1_MANAGER",
        title: "[HITL 1] Chờ Trưởng phòng KD phê duyệt phân công / xử lý SLA",
        channel: "Phê duyệt nội bộ -> Email + Zalo",
        sla_deadline: "Trình duyệt ngay (SLA " + scoring.sla_hours + "h)",
        checklist: [
          "Trưởng phòng Hoàng Đức Thắng xác nhận 1 đầu mối Sales duy nhất",
          "Sau khi duyệt [HITL 1], Sales thực hiện [HITL 2] kiểm duyệt & gửi"
        ]
      };
    }
    if (analysis.needs_enrichment_draft) {
      return {
        code: "ENRICH_VIA_DRAFT",
        title: "[HITL 2] Sales duyệt & gửi " + Math.max(1, (analysis.missing_fields || []).length) + " câu hỏi khai thác bổ sung",
        channel: "Zalo + Email",
        sla_deadline: "Trong " + scoring.sla_hours + " giờ",
        checklist: [
          "Kiểm tra câu hỏi khai thác thông tin thiếu (Bước 2)",
          "Chỉnh sửa giọng văn tự nhiên [HITL 2] trước khi gửi"
        ]
      };
    }
    return {
      code: "PROPOSE_AND_DEMO",
      title: "[HITL 2] Sales duyệt bản nháp chào gói " + analysis.primary_product_code + " & hẹn Demo",
      channel: "Email + Zalo + Gọi",
      sla_deadline: "Trong " + scoring.sla_hours + " giờ (" + scoring.priority_label + ")",
      checklist: [
        "Rà soát hồ sơ đã gộp & nhu cầu liên phòng ban",
        "Duyệt bản nháp chào hàng [HITL 2] và gửi lịch Demo"
      ]
    };
  }

  function composeOutreachDraft(cluster, analysis, routing) {
    var primaryContact = cluster.contacts[0] || { contact_name: "Quý Anh/Chị" };
    var repName = routing.proposed_rep ? routing.proposed_rep.name : "Đội ngũ Tư vấn Nam Việt";

    if (cluster.is_dnc) {
      return {
        type: "DNC_NO_CONTACT",
        subject: "[DNC - KHÔNG GỬI] " + cluster.company_name,
        questions: [],
        message: "Hồ sơ thuộc Danh sách Không liên hệ lại (DNC): " + cluster.dnc_reason + "\nHệ thống đã khóa tự động việc gửi Email/Zalo và gọi điện.",
        zalo_message: ""
      };
    }

    if (routing.unmatched_sales) {
      return {
        type: "UNMATCHED_HOLD",
        subject: "[Chờ gán Sales] Hồ sơ chưa khớp phụ trách: " + cluster.company_name,
        questions: [],
        message: "Hồ sơ đang ở hàng đợi 'Khách chưa có người phù hợp' do chưa có NVKD phụ trách khu vực (" +
          (cluster.primary_region || "Chưa rõ") + ") hoặc ngành (" + (cluster.primary_industry || "Chưa rõ") + ").",
        zalo_message: ""
      };
    }

    if (analysis.is_out_of_scope) {
      return {
        type: "DISQUALIFY_REFERRAL",
        subject: "[Nam Việt Software] Phản hồi yêu cầu giải pháp cho " + cluster.company_name,
        questions: [],
        message:
          "Kính gửi Anh/Chị " + primaryContact.contact_name + ",\n\n" +
          "Cảm ơn " + cluster.company_name + " đã quan tâm đến các giải pháp công nghệ của Công ty Nam Việt.\n" +
          "Qua rà soát nhu cầu (" + analysis.oos_detail.label + "), hiện tại Nam Việt tập trung chuyên sâu vào bộ phần mềm quản trị SME chuẩn hóa (Kế toán, CRM, Nhân sự, Kho) nên chưa đáp ứng được yêu cầu chuyên ngành sâu này.\n" +
          "Nếu Anh/Chị có nhu cầu tìm hiểu đối tác chuyên biệt hoặc các phân hệ quản trị văn phòng/kế toán bổ trợ, chúng tôi rất sẵn lòng kết nối hỗ trợ.\n\n" +
          "Trân trọng,\nBộ phận Tiếp nhận & Tư vấn - Công ty Nam Việt",
        zalo_message: ""
      };
    }

    var questions = [];
    if (analysis.missing_fields.indexOf("Phân hệ phần mềm cụ thể (Kế toán / CRM / Kho / Nhân sự)") !== -1) {
      questions.push("Hiện tại doanh nghiệp đang ưu tiên chuẩn hóa mảng nào trước: Kế toán/Hóa đơn, Quản lý Kho/Bán lẻ, Quản lý Khách hàng (CRM) hay Chấm công/Tính lương?");
    }
    if (analysis.missing_fields.indexOf("Quy mô nhân sự") !== -1) {
      questions.push("Tổng số nhân sự và số lượng tài khoản dự kiến sử dụng phần mềm là khoảng bao nhiêu người?");
    }
    if (analysis.missing_fields.indexOf("Ngân sách dự kiến") !== -1) {
      questions.push("Ngân sách đầu tư dự kiến cho phần mềm trong năm đầu tiên của Quý công ty khoảng bao nhiêu để bên em đề xuất gói tối ưu nhất?");
    }
    if (analysis.missing_fields.indexOf("Thời gian dự kiến triển khai") !== -1) {
      questions.push("Quý công ty dự kiến mốc thời gian nào cần đưa hệ thống vào vận hành chính thức?");
    }
    if (analysis.missing_fields.indexOf("Người ra quyết định / Chức vụ") !== -1) {
      questions.push("Anh/Chị vui lòng cho biết thêm chức vụ của mình và anh/chị phụ trách quyết định phê duyệt giải pháp để bên em gửi tài liệu phù hợp nhất?");
    }
    if (analysis.missing_fields.indexOf("Khu vực / Tỉnh thành") !== -1) {
      questions.push("Văn phòng/chi nhánh triển khai chính của Quý công ty đang đặt tại tỉnh/thành nào để chuyên viên khu vực hỗ trợ trực tiếp?");
    }

    var multiContactNote = cluster.contacts.length > 1
      ? " (bao gồm tổng hợp nhu cầu từ " + cluster.contacts.map(function (c) { return c.contact_name; }).join(", ") + ")"
      : "";

    var body = "Kính chào Anh/Chị " + primaryContact.contact_name + ",\n\n" +
      "Em là " + repName + " từ Công ty Phần mềm Nam Việt. Cảm ơn " + cluster.company_name +
      " đã gửi thông tin quan tâm giải pháp quản trị doanh nghiệp SME" + multiContactNote + ".\n\n";

    var zaloMsg = "";
    if (analysis.needs_enrichment_draft && questions.length > 0) {
      body += "Để chuẩn bị kịch bản Demo sát nhất với mô hình vận hành của mình trước buổi trao đổi 15 phút, Anh/Chị hỗ trợ giúp em thêm " + questions.length + " thông tin nhanh sau nhé:\n";
      for (var q = 0; q < questions.length; q++) {
        body += (q + 1) + ". " + questions[q] + "\n";
      }
      body += "\nNếu thuận tiện, em xin phép gọi nhanh lúc 10:00 hoặc 15:00 ngày mai để trao đổi trực tiếp.\n\n";
      zaloMsg = "Chào Anh/Chị " + primaryContact.contact_name + ", em là " + repName + " (Nam Việt Soft). Cảm ơn " + cluster.company_name + " đã quan tâm gói " + analysis.primary_product_code + ". Anh/Chị cho em hỏi nhanh " + questions.length + " ý để gửi báo giá & demo đúng nhu cầu ạ: " + questions.slice(0, 2).join(" ");
    } else {
      body += "Qua rà soát nhu cầu về " + analysis.primary_product_name +
        (cluster.company_size ? " cho quy mô " + cluster.company_size + " nhân sự" : "") +
        ", hệ thống của Nam Việt hoàn toàn đáp ứng tốt" +
        (cluster.timeline ? " theo tiến độ dự kiến (" + cluster.timeline + ")" : "") + ".\n" +
        "Em đã chuẩn bị sẵn tài liệu giải pháp và kịch bản Demo thực tế cho ngành " + (cluster.primary_industry || "SME") + ". Anh/Chị vui lòng chọn khung giờ phù hợp trong 1-2 ngày tới để em đặt lịch trình bày chi tiết.\n\n";
      zaloMsg = "Chào Anh/Chị " + primaryContact.contact_name + ", em là " + repName + " từ Nam Việt Soft. Em đã tiếp nhận nhu cầu " + analysis.primary_product_code + " của " + cluster.company_name + " và chuẩn bị sẵn kịch bản Demo. Anh/Chị tiện trao đổi 15 phút vào khung giờ nào hôm nay/ngày mai ạ?";
    }

    body += "Trân trọng,\n" + repName + " — Công ty Phần mềm Nam Việt";

    return {
      type: analysis.needs_enrichment_draft ? "ENRICHMENT_QUESTIONS" : "DIRECT_APPROACH",
      subject: "[Nam Việt] Đề xuất giải pháp " + analysis.primary_product_code + " cho " + cluster.company_name,
      questions: questions,
      message: body,
      zalo_message: zaloMsg
    };
  }

  // =========================================================================
  // 7. Determine Workflow Stage, HITL 2 State & Audit Log (Theo Flowchart Mới)
  // =========================================================================
  function determineWorkflowOutcome(cluster, analysis, scoring, routing) {
    var logs = [];
    logs.push({
      step: "Bước 1 [AI]: Chuẩn hóa & Khử trùng lặp",
      detail: cluster.raw_record_count > 1
        ? "Gom nhóm " + cluster.raw_record_count + " bản ghi (" + cluster.aliases.join(" | ") + ") thành 1 hồ sơ. Lý do: " + cluster.dedup_reasons.join("; ")
        : "Đã chuẩn hóa tên, SĐT, email" + (cluster.matched_history ? " và đối chiếu lịch sử " + cluster.matched_history.history_id : ".")
    });

    if (cluster.is_dnc) {
      logs.push({
        step: "Rẽ nhánh DNC (Lịch sử liên hệ -> No)",
        detail: "Chuyển thẳng vào Danh sách không liên hệ lại (DNC): " + cluster.dnc_reason
      });
      return {
        workflow_stage: "DNC_LIST",
        workflow_stage_label: "Không liên hệ lại (DNC)",
        hitl2: { required: false, status: "NOT_REQUIRED", blocked_by_hitl1: false, channel: "", reviewed_by: null, reviewed_at: null, note: "" },
        audit_logs: logs
      };
    }

    logs.push({
      step: "Bước 2 [AI]: Tổng hợp nhu cầu & Thiếu hụt",
      detail: "Độ đầy đủ " + analysis.completeness_pct + "% • SP: " + analysis.primary_product_code +
        (analysis.missing_fields.length ? " • Thiếu: " + analysis.missing_fields.join(", ") : " • Đủ thông tin")
    });

    var stageCode = "ASSIGNED_TO_REP";
    var stageLabel = "Giao Sales -> [HITL 2] Chờ duyệt gửi";

    if (analysis.is_out_of_scope || scoring.tier === "D") {
      stageCode = "DISQUALIFIED_OUT_OF_SCOPE";
      stageLabel = "Ngoài phạm vi (Chặn bẫy/Loại)";
      logs.push({ step: "Bước 3 [AI]: Chấm điểm & Sàng lọc", detail: "Điểm " + scoring.total_score + "/100 (" + scoring.priority_label + "). Chặn ngoài phạm vi SME." });
    } else if (routing.unmatched_sales) {
      stageCode = "UNMATCHED_SALES";
      stageLabel = "Khách chưa có người phù hợp";
      logs.push({ step: "Bước 3 [AI]: Chấm điểm ưu tiên", detail: "Điểm " + scoring.total_score + "/100 (Hạng " + scoring.tier + " • " + scoring.priority_label + ")." });
      logs.push({ step: "Bước 4 [AI]: Rẽ nhánh Không khớp Sales", detail: routing.routing_reason });
    } else if (routing.requires_manager_approval) {
      stageCode = "PENDING_MANAGER_APPROVAL";
      stageLabel = "[HITL 1] Chờ Trưởng phòng KD duyệt";
      logs.push({ step: "Bước 3 [AI]: Chấm điểm ưu tiên", detail: "Điểm " + scoring.total_score + "/100 (Hạng " + scoring.tier + " • " + scoring.priority_label + ")." });
      logs.push({
        step: "Bước 4 -> [HITL 1] Ngoại lệ / Xung đột",
        detail: "Đề xuất " + routing.proposed_rep.name + " • Cảnh báo: " + routing.escalation_triggers.map(function (t) { return t.message; }).join(" | ")
      });
    } else if (analysis.needs_enrichment_draft) {
      stageCode = "DRAFT_FOR_ENRICHMENT";
      stageLabel = "Bước 5: Draft hỏi thêm -> [HITL 2]";
      logs.push({ step: "Bước 3-4 [AI]: Chấm điểm & Giao Sales", detail: scoring.total_score + "/100 (" + scoring.priority_label + ") • Giao " + routing.proposed_rep.name + "." });
      logs.push({ step: "Bước 5 [AI]: Tạo Action & Bản nháp câu hỏi", detail: "Soạn câu hỏi khai thác (" + analysis.missing_fields.length + " mục thiếu) -> Chờ [HITL 2] Sales kiểm duyệt trước khi gửi." });
    } else {
      stageCode = "ASSIGNED_TO_REP";
      stageLabel = "Bước 5: Giao Sales -> [HITL 2] Chờ gửi";
      logs.push({ step: "Bước 3-4 [AI]: Chấm điểm & Giao Sales", detail: scoring.total_score + "/100 (" + scoring.priority_label + ") • Giao " + routing.proposed_rep.name + " (SLA " + scoring.sla_hours + "h)." });
      logs.push({ step: "Bước 5 [AI]: Tạo Action & Bản nháp Email/Zalo", detail: "Đã tạo Next Action & bản nháp chào hàng -> Chờ [HITL 2] Sales kiểm duyệt trước khi gửi." });
    }

    var needsHitl2 = !!(routing.proposed_rep && !cluster.is_dnc && scoring.tier !== "D" && !routing.unmatched_sales);
    logs.push({
      step: "Output: Cập nhật & Ghi Log Truy vết",
      detail: "Trạng thái: " + stageLabel + "."
    });

    return {
      workflow_stage: stageCode,
      workflow_stage_label: stageLabel,
      hitl2: {
        required: needsHitl2,
        status: needsHitl2 ? "PENDING_REP_REVIEW" : "NOT_REQUIRED",
        blocked_by_hitl1: stageCode === "PENDING_MANAGER_APPROVAL",
        channel: "Email + Zalo",
        reviewed_by: null,
        reviewed_at: null,
        note: ""
      },
      audit_logs: logs
    };
  }

  // =========================================================================
  // 8. Business Insights, Flowchart Outputs & Recommendations
  // =========================================================================
  function generateBusinessInsights(clusters, rawLeads, salesTeam) {
    var totalRaw = rawLeads.length;
    var totalUnified = clusters.length;
    var dupRecordsSaved = Math.max(0, totalRaw - totalUnified);
    var clusterWithDup = clusters.filter(function (c) { return c.is_duplicate_cluster; }).length;

    var hotOrWarm = clusters.filter(function (c) { return c.scoring.tier === "A" || c.scoring.tier === "B"; });
    var hotCount = clusters.filter(function (c) { return c.scoring.tier === "A"; }).length;
    var warmCount = clusters.filter(function (c) { return c.scoring.tier === "B"; }).length;
    var coldCount = clusters.filter(function (c) { return c.scoring.tier === "C"; }).length;

    var dncList = clusters.filter(function (c) { return c.workflow_stage === "DNC_LIST"; });
    var unmatchedSalesList = clusters.filter(function (c) { return c.workflow_stage === "UNMATCHED_SALES"; });
    var enrichmentDrafts = clusters.filter(function (c) { return c.workflow_stage === "DRAFT_FOR_ENRICHMENT"; });
    var bigBudgetTraps = clusters.filter(function (c) { return c.scoring.big_budget_trap_prevented; });
    var disqualified = clusters.filter(function (c) { return c.workflow_stage === "DISQUALIFIED_OUT_OF_SCOPE"; });
    var managerQueue = clusters.filter(function (c) { return c.workflow_stage === "PENDING_MANAGER_APPROVAL"; });
    var neglectedAlerts = clusters.filter(function (c) {
      return c.routing.escalation_triggers.some(function (t) { return t.code === "NEGLECTED_LEAD_ALERT"; });
    });
    var hitl2Pending = clusters.filter(function (c) { return c.hitl2 && c.hitl2.required && c.hitl2.status === "PENDING_REP_REVIEW"; });
    var hitl2Approved = clusters.filter(function (c) { return c.hitl2 && c.hitl2.status === "APPROVED_AND_SENT"; });

    // Source ROI breakdown
    var sourceStats = {};
    for (var i = 0; i < clusters.length; i++) {
      var cl = clusters[i];
      for (var s = 0; s < cl.sources.length; s++) {
        var src = cl.sources[s];
        if (!sourceStats[src]) sourceStats[src] = { source: src, total: 0, qualified: 0, oos: 0, incomplete: 0 };
        sourceStats[src].total++;
        if (cl.scoring.tier === "A" || cl.scoring.tier === "B") sourceStats[src].qualified++;
        else if (cl.scoring.tier === "D") sourceStats[src].oos++;
        else sourceStats[src].incomplete++;
      }
    }

    // Product demand breakdown
    var productDemand = {};
    for (var p = 0; p < clusters.length; p++) {
      var cItem = clusters[p];
      if (cItem.scoring.tier === "D") continue;
      var pCode = cItem.analysis.primary_product_code;
      if (!productDemand[pCode]) productDemand[pCode] = { code: pCode, name: cItem.analysis.primary_product_name, count: 0, total_budget: 0 };
      productDemand[pCode].count++;
      if (cItem.budget_vnd) productDemand[pCode].total_budget += cItem.budget_vnd;
    }

    // Rep workload distribution after batch
    var repLoadMap = {};
    var reps = (salesTeam && salesTeam.sales_reps) || [];
    for (var r = 0; r < reps.length; r++) {
      repLoadMap[reps[r].id] = {
        id: reps[r].id,
        name: reps[r].name,
        region: reps[r].region,
        existing_leads: reps[r].current_active_leads,
        new_assigned: 0,
        capacity: reps[r].weekly_capacity
      };
    }
    for (var k = 0; k < clusters.length; k++) {
      var rep = clusters[k].routing.proposed_rep;
      if (rep && repLoadMap[rep.id] && clusters[k].scoring.tier !== "D") {
        repLoadMap[rep.id].new_assigned++;
      }
    }

    var estimatedPipelineVnd = 0;
    for (var j = 0; j < clusters.length; j++) {
      if (clusters[j].scoring.tier !== "D" && clusters[j].budget_vnd) {
        estimatedPipelineVnd += clusters[j].budget_vnd;
      }
    }

    var recommendations = [];
    if (dupRecordsSaved > 0 || clusterWithDup > 0) {
      recommendations.push({
        category: "Bước 1: Chống gọi trùng & Kiểm tra DNC",
        priority: "Cao",
        insight: "AI Agent đã gom nhóm " + totalRaw + " bản ghi thô thành " + totalUnified + " doanh nghiệp duy nhất (giảm " + dupRecordsSaved + " bản ghi trùng, khớp " + clusterWithDup + " cụm lịch sử/alias" + (dncList.length ? ", chặn " + dncList.length + " hồ sơ DNC" : "") + ").",
        action: "Hợp nhất thành 1 đầu mối chăm sóc duy nhất cho các công ty đa người đăng ký (như Thịnh Vượng, An Khang, An Phát) để bán gói Combo All-in-One Suite thay vì bán lẻ từng module."
      });
    }
    if (bigBudgetTraps.length > 0) {
      var trapBudget = bigBudgetTraps.reduce(function (acc, c) { return acc + (c.budget_vnd || 0); }, 0);
      recommendations.push({
        category: "Bước 3: Loại bẫy ngân sách lớn sai sản phẩm",
        priority: "Rất cao",
        insight: "Phát hiện " + bigBudgetTraps.length + " hồ sơ có ngân sách lớn (tổng " + formatVnd(trapBudget) + ") nhưng nhu cầu ngoài phạm vi phần mềm SME (HIS bệnh viện, MES/PLC nhà máy).",
        action: "Loại khỏi hàng đợi ưu tiên của 8 NVKD ngay lập tức để tiết kiệm ~25% thời gian tư vấn và dồn nguồn lực vào " + hotOrWarm.length + " hồ sơ khớp đúng sản phẩm."
      });
    }
    if (enrichmentDrafts.length > 0 || unmatchedSalesList.length > 0) {
      recommendations.push({
        category: "Bước 2 & 5: Cứu hồ sơ thiếu thông tin & Không khớp Sales",
        priority: "Cao",
        insight: "Có " + enrichmentDrafts.length + " doanh nghiệp SME thiếu thông tin cần gửi Draft câu hỏi bổ sung" + (unmatchedSalesList.length ? " và " + unmatchedSalesList.length + " khách chưa có Sales khớp vùng/ngành." : "."),
        action: "Không bỏ qua hồ sơ thiếu dữ liệu — Sales duyệt bản nháp [HITL 2] và gửi câu hỏi khai thác trong 24h để chuyển đổi sang nhóm Warm/Hot."
      });
    }
    if (managerQueue.length > 0 || neglectedAlerts.length > 0) {
      recommendations.push({
        category: "[HITL 1] Kiểm soát kỷ luật SLA & Tranh chấp",
        priority: "Khẩn cấp",
        insight: "Trưởng phòng Kinh doanh cần xử lý " + managerQueue.length + " ca vượt thẩm quyền/tranh chấp, trong đó có " + neglectedAlerts.length + " cơ hội từng bị bỏ quên quá 7 ngày.",
        action: "Ưu tiên duyệt [HITL 1] phân công và điều chuyển các lead bị bỏ quên ngay trong ngày trước khi mở khóa cho Sales thực hiện [HITL 2]."
      });
    }

    return {
      summary: {
        raw_leads_count: totalRaw,
        unified_companies_count: totalUnified,
        duplicates_merged_count: dupRecordsSaved,
        duplicate_clusters_count: clusterWithDup,
        dnc_count: dncList.length,
        hot_count: hotCount,
        warm_count: warmCount,
        cold_count: coldCount,
        hot_warm_count: hotOrWarm.length,
        enrichment_draft_count: enrichmentDrafts.length,
        unmatched_sales_count: unmatchedSalesList.length,
        disqualified_count: disqualified.length + dncList.length,
        oos_only_count: disqualified.length,
        big_budget_traps_count: bigBudgetTraps.length,
        manager_approval_count: managerQueue.length,
        neglected_alerts_count: neglectedAlerts.length,
        exceptions_count: dncList.length + managerQueue.length + unmatchedSalesList.length + disqualified.length,
        hitl2_pending_count: hitl2Pending.length,
        hitl2_approved_count: hitl2Approved.length,
        estimated_qualified_pipeline_vnd: estimatedPipelineVnd
      },
      source_stats: Object.keys(sourceStats).map(function (k) { return sourceStats[k]; }),
      product_demand: Object.keys(productDemand).map(function (k) { return productDemand[k]; }).sort(function (a, b) { return b.count - a.count; }),
      rep_workloads: Object.keys(repLoadMap).map(function (k) { return repLoadMap[k]; }),
      recommendations: recommendations
    };
  }

  function buildFlowchartOutputs(clusters, insights, salesTeam) {
    var reps = (salesTeam && salesTeam.sales_reps) || [];
    var salesTasks = reps.map(function (rep) {
      var repClusters = clusters.filter(function (c) {
        return c.routing.proposed_rep && c.routing.proposed_rep.id === rep.id && c.scoring.tier !== "D";
      });
      return {
        rep_id: rep.id,
        rep_name: rep.name,
        region: rep.region,
        assigned_count: repClusters.length,
        hitl2_pending_count: repClusters.filter(function (c) { return c.hitl2 && c.hitl2.status === "PENDING_REP_REVIEW"; }).length,
        hitl2_sent_count: repClusters.filter(function (c) { return c.hitl2 && c.hitl2.status === "APPROVED_AND_SENT"; }).length,
        tasks: repClusters.map(function (c) {
          return {
            cluster_id: c.cluster_id,
            company_name: c.company_name,
            tier: c.scoring.tier,
            priority_label: c.scoring.priority_label,
            next_action: c.next_action ? c.next_action.title : "",
            workflow_stage: c.workflow_stage,
            hitl2_status: c.hitl2 ? c.hitl2.status : "NOT_REQUIRED"
          };
        })
      };
    });

    var exceptions = {
      dnc: clusters.filter(function (c) { return c.workflow_stage === "DNC_LIST"; }),
      hitl1_pending: clusters.filter(function (c) { return c.workflow_stage === "PENDING_MANAGER_APPROVAL"; }),
      unmatched_sales: clusters.filter(function (c) { return c.workflow_stage === "UNMATCHED_SALES"; }),
      out_of_scope: clusters.filter(function (c) { return c.workflow_stage === "DISQUALIFIED_OUT_OF_SCOPE"; })
    };

    var auditTrail = [];
    clusters.forEach(function (c) {
      (c.audit_logs || []).forEach(function (lg) {
        auditTrail.push({
          cluster_id: c.cluster_id,
          company_name: c.company_name,
          stage: c.workflow_stage_label,
          step: lg.step,
          detail: lg.detail
        });
      });
    });

    return {
      unified_profiles: clusters,
      sales_task_lists: salesTasks,
      exceptions: exceptions,
      audit_trail: auditTrail
    };
  }

  // =========================================================================
  // 9. Main Orchestrator Entrypoint
  // =========================================================================
  function runAgentPipeline(rawLeads, datasets) {
    var data = datasets || root.NAMVIET_DATA;
    if (!data) throw new Error("Thiếu dữ liệu tham chiếu Công ty Nam Việt.");

    var clusters = clusterLeads(rawLeads || [], data.contactHistory, data.rules);
    var processed = [];

    for (var i = 0; i < clusters.length; i++) {
      var cl = clusters[i];
      var analysis = analyzeProductAndCompleteness(cl, data.catalog, data.rules);
      var scoring = scoreCluster(cl, analysis, data.rules);
      var routing = routeClusterToSales(cl, analysis, scoring, data.salesTeam, data.rules);
      var nextAction = buildNextAction(cl, analysis, scoring, routing);
      var draft = composeOutreachDraft(cl, analysis, routing);
      var workflow = determineWorkflowOutcome(cl, analysis, scoring, routing);

      processed.push({
        cluster_id: cl.cluster_id,
        company_name: cl.company_name,
        aliases: cl.aliases,
        is_duplicate_cluster: cl.is_duplicate_cluster,
        raw_record_count: cl.raw_record_count,
        dedup_reasons: cl.dedup_reasons,
        tax_id: cl.tax_id,
        domain: cl.domain,
        sources: cl.sources,
        regions: cl.regions,
        primary_region: cl.primary_region,
        industries: cl.industries,
        primary_industry: cl.primary_industry,
        company_size: cl.company_size,
        budget_vnd: cl.budget_vnd,
        timeline: cl.timeline,
        contacts: cl.contacts,
        combined_need: cl.combined_need,
        matched_history: cl.matched_history,
        history_match_reason: cl.history_match_reason,
        is_dnc: cl.is_dnc,
        dnc_reason: cl.dnc_reason,
        raw_leads: cl.raw_leads,
        analysis: analysis,
        scoring: scoring,
        routing: routing,
        next_action: nextAction,
        draft: draft,
        hitl2: workflow.hitl2,
        workflow_stage: workflow.workflow_stage,
        workflow_stage_label: workflow.workflow_stage_label,
        audit_logs: workflow.audit_logs,
        raw_record: (cl.raw_leads && cl.raw_leads[0] && cl.raw_leads[0].raw_record) || null
      });
    }

    // Sort priority: Pending Manager Approval / Hot A -> Warm B -> Cold C -> Unmatched -> Disqualified/DNC
    processed.sort(function (a, b) {
      if (a.scoring.tier === "D" && b.scoring.tier !== "D") return 1;
      if (b.scoring.tier === "D" && a.scoring.tier !== "D") return -1;
      if (b.scoring.total_score !== a.scoring.total_score) {
        return b.scoring.total_score - a.scoring.total_score;
      }
      return (b.budget_vnd || 0) - (a.budget_vnd || 0);
    });

    var insights = generateBusinessInsights(processed, rawLeads || [], data.salesTeam);
    var outputs = buildFlowchartOutputs(processed, insights, data.salesTeam);

    return {
      processed_at: new Date().toISOString(),
      mode: "HYBRID_AGENT_RULE_ENGINE",
      clusters: processed,
      insights: insights,
      outputs: outputs
    };
  }

  function applyManagerDecision(cluster, decision, newRepId, note, salesTeam) {
    var reps = (salesTeam && salesTeam.sales_reps) || [];
    if (decision === "APPROVE") {
      if (newRepId) {
        var foundRep = reps.filter(function (r) { return r.id === newRepId; })[0];
        if (foundRep) {
          cluster.routing.proposed_rep = foundRep;
          cluster.routing.unmatched_sales = false;
          cluster.routing.routing_reason = "Trưởng phòng KD [HITL 1] phê duyệt giao cho " + foundRep.name + (note ? " (" + note + ")" : "");
        }
      }
      cluster.routing.manager_approval_status = "APPROVED";
      cluster.workflow_stage = cluster.analysis.needs_enrichment_draft ? "DRAFT_FOR_ENRICHMENT" : "ASSIGNED_TO_REP";
      cluster.workflow_stage_label = cluster.analysis.needs_enrichment_draft
        ? "[HITL 1] Đã duyệt -> Bước 5 Draft / [HITL 2]"
        : "[HITL 1] Đã duyệt -> Bước 5 / [HITL 2]";
      if (cluster.hitl2) {
        cluster.hitl2.required = !!cluster.routing.proposed_rep;
        cluster.hitl2.blocked_by_hitl1 = false;
        if (cluster.hitl2.status === "NOT_REQUIRED" && cluster.routing.proposed_rep) {
          cluster.hitl2.status = "PENDING_REP_REVIEW";
        }
      }
      cluster.next_action = buildNextAction(cluster, cluster.analysis, cluster.scoring, Object.assign({}, cluster.routing, { requires_manager_approval: false }));
      cluster.audit_logs.push({
        step: "[HITL 1] Phê duyệt của Trưởng phòng KD",
        detail: "Đã duyệt giao " + (cluster.routing.proposed_rep ? cluster.routing.proposed_rep.name : "N/A") + (note ? ". Ghi chú: " + note : "") + " -> Chuyển Bước 5 & [HITL 2]."
      });
    } else if (decision === "REJECT_HOLD") {
      cluster.routing.manager_approval_status = "HELD";
      cluster.workflow_stage = "MANAGER_ON_HOLD";
      cluster.workflow_stage_label = "[HITL 1] Trưởng phòng tạm giữ xử lý";
      if (cluster.hitl2) cluster.hitl2.blocked_by_hitl1 = true;
      cluster.audit_logs.push({
        step: "[HITL 1] Trưởng phòng KD tạm giữ",
        detail: note || "Cần rà soát thêm trước khi giao Sales."
      });
    }
    return cluster;
  }

  function applyRepReviewDecision(cluster, channel, editedMessage, note) {
    if (!cluster) return cluster;
    if (editedMessage != null && String(editedMessage).trim()) {
      cluster.draft.message = String(editedMessage);
    }
    var repName = cluster.routing && cluster.routing.proposed_rep ? cluster.routing.proposed_rep.name : "NVKD phụ trách";
    var ch = channel || (cluster.hitl2 && cluster.hitl2.channel) || "Email + Zalo";
    if (!cluster.hitl2) {
      cluster.hitl2 = { required: true, status: "APPROVED_AND_SENT", blocked_by_hitl1: false, channel: ch };
    }
    cluster.hitl2.status = "APPROVED_AND_SENT";
    cluster.hitl2.channel = ch;
    cluster.hitl2.reviewed_by = repName;
    cluster.hitl2.reviewed_at = new Date().toISOString();
    cluster.hitl2.note = note || "";
    cluster.workflow_stage_label = "[HITL 2] Sales đã duyệt & gửi (" + ch + ")";
    cluster.audit_logs.push({
      step: "[HITL 2] Sales kiểm duyệt trước khi gửi",
      detail: repName + " đã rà soát căn cứ, xác nhận bản nháp và gửi qua " + ch + (note ? " (" + note + ")" : ".")
    });
    return cluster;
  }

  // =========================================================================
  // 10. Optional Live LLM Enrichment (Gemini / OpenAI API)
  // =========================================================================
  function enrichWithLiveLLM(pipelineResult, llmConfig) {
    if (!llmConfig || !llmConfig.apiKey) {
      return Promise.resolve(pipelineResult);
    }
    var topClusters = pipelineResult.clusters.slice(0, 12).map(function (c) {
      return {
        cluster_id: c.cluster_id,
        company_name: c.company_name,
        primary_product: c.analysis.primary_product_code,
        score: c.scoring.total_score,
        tier: c.scoring.tier,
        missing_fields: c.analysis.missing_fields,
        combined_need: c.combined_need,
        budget_vnd: c.budget_vnd
      };
    });

    var systemPrompt =
      "Bạn là AI Sales Strategist cho Công ty Phần mềm Nam Việt (phần mềm quản lý SME: Kế toán, CRM, HRM, Kho).\n" +
      "Dựa trên danh sách khách hàng đã được Engine chấm điểm & lọc trùng bên dưới, hãy trả về JSON hợp lệ theo mẫu:\n" +
      "{ \"executive_summary\": \"...\", \"cluster_advice\": [ { \"cluster_id\": \"CL-001\", \"sales_angle\": \"...\", \"refined_opening\": \"...\" } ] }\n" +
      "Chỉ viết tiếng Việt ngắn gọn, thực tế, không thay đổi điểm số hay cấp bậc đã chấm.";

    var userPrompt = "Dữ liệu batch hiện tại:\n" + JSON.stringify({
      summary: pipelineResult.insights.summary,
      clusters: topClusters
    });

    var provider = llmConfig.provider || "gemini";
    var fetchPromise;

    if (provider === "gemini") {
      var model = llmConfig.model || "gemini-2.5-flash";
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(llmConfig.apiKey);
      fetchPromise = fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
        })
      }).then(function (r) {
        if (!r.ok) throw new Error("Gemini API HTTP " + r.status);
        return r.json();
      }).then(function (json) {
        var txt = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
        return JSON.parse(txt);
      });
    } else {
      var oaiUrl = (llmConfig.baseUrl || "https://api.openai.com/v1") + "/chat/completions";
      fetchPromise = fetch(oaiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + llmConfig.apiKey
        },
        body: JSON.stringify({
          model: llmConfig.model || "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      }).then(function (r) {
        if (!r.ok) throw new Error("OpenAI API HTTP " + r.status);
        return r.json();
      }).then(function (json) {
        var txt = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        return JSON.parse(txt);
      });
    }

    return fetchPromise.then(function (parsed) {
      pipelineResult.mode = "LIVE_LLM_PLUS_GUARDRAILS (" + provider.toUpperCase() + ")";
      pipelineResult.llm_executive_summary = parsed.executive_summary || "";
      var adviceMap = {};
      (parsed.cluster_advice || []).forEach(function (item) {
        adviceMap[item.cluster_id] = item;
      });
      pipelineResult.clusters.forEach(function (c) {
        if (adviceMap[c.cluster_id]) {
          c.llm_advice = adviceMap[c.cluster_id];
        }
      });
      return pipelineResult;
    });
  }

  root.NamVietAgent = {
    stripAccents: stripAccents,
    formatVnd: formatVnd,
    normalizePhone: normalizePhone,
    extractCompanyTokensAndAliases: extractCompanyTokensAndAliases,
    clusterLeads: clusterLeads,
    analyzeProductAndCompleteness: analyzeProductAndCompleteness,
    scoreCluster: scoreCluster,
    routeClusterToSales: routeClusterToSales,
    runAgentPipeline: runAgentPipeline,
    applyManagerDecision: applyManagerDecision,
    applyRepReviewDecision: applyRepReviewDecision,
    enrichWithLiveLLM: enrichWithLiveLLM
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
