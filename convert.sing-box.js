/*!
powerfullz 的 Substore Sing-Box 订阅转换脚本
https://github.com/powerfullz/override-rules
*/
"use strict";
(() => {
  // src/utils.ts
  function parseBool(value, defaultValue = false) {
    if (typeof value === "undefined") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "true" || value === "1";
    }
    return false;
  }
  function parseNumber(value, defaultValue = 0) {
    if (value === null || typeof value === "undefined") {
      return defaultValue;
    }
    const num = parseInt(String(value), 10);
    return Number.isNaN(num) ? defaultValue : num;
  }
  function buildList(...elements) {
    return elements.flat().filter(Boolean);
  }
  function createCaseInsensitiveNodeMatcher(source2) {
    return {
      source: source2,
      regex: new RegExp(source2, "i"),
      pattern: `(?i)${source2}`
    };
  }
  function isNotNull(v) {
    return v !== null;
  }

  // src/args.ts
  function parseGroupType(args) {
    if (parseBool(args.loadbalance)) return 2;
    const raw = parseNumber(args.grouptype, 1);
    if (raw === 0 || raw === 1 || raw === 2) return raw;
    return 1;
  }
  function buildFeatureFlags(args) {
    return {
      groupType: parseGroupType(args),
      ipv6Enabled: parseBool(args.ipv6),
      fullConfig: parseBool(args.full),
      keepAliveEnabled: parseBool(args.keepalive),
      fakeIPEnabled: parseBool(args.fakeip, true),
      quicEnabled: parseBool(args.quic),
      regexFilter: parseBool(args.regex),
      tunEnabled: parseBool(args.tun),
      countryThreshold: parseNumber(args.threshold, 2),
      adBlockEnabled: parseBool(args.adblock, true),
      sogouBlockEnabled: parseBool(args.sogoublock)
    };
  }

  // src/constants.ts
  var NODE_SUFFIX = "节点";
  var CDN_URL = "https://cdn.jsdelivr.net";
  var SPEEDTEST_URL = "https://cp.cloudflare.com";
  var LOW_COST_NODE_MATCHER = createCaseInsensitiveNodeMatcher(
    String.raw`0\.[0-5]|低倍率|省流|实验性`
  );
  var PROXY_GROUPS = {
    SELECT: "选择代理",
    MANUAL: "手动选择",
    AUTO: "自动选择",
    FALLBACK: "故障转移",
    LANDING: "落地节点",
    LOW_COST: "低倍率节点",
    FRONT_PROXY: "前置代理",
    STATIC_RESOURCES: "静态资源",
    AI_SERVICE: "AI服务",
    CRYPTO: "加密货币",
    APPLE: "苹果服务",
    GOOGLE: "谷歌服务",
    MICROSOFT: "微软服务",
    BILIBILI: "哔哩哔哩",
    BAHAMUT: "巴哈姆特",
    XBOX: "Xbox",
    GITHUB: "Github",
    YOUTUBE: "Youtube",
    NETFLIX: "Netflix",
    TIKTOK: "TikTok",
    SPOTIFY: "Spotify",
    EHENTAI: "E-Hentai",
    TELEGRAM: "Telegram",
    TRUTH_SOCIAL: "Truth Social",
    TWITTER: "Twitter",
    TWITCH: "Twitch",
    WEIBO: "新浪微博",
    PIKPAK: "PikPak网盘",
    SSH: "SSH",
    SOGOU_INPUT: "搜狗输入法",
    AD_BLOCK: "广告拦截",
    GLOBAL: "GLOBAL",
    FINAL: "Final"
  };
  var countriesMeta = {
    香港: {
      weight: 10,
      pattern: "香港|港|\\b(?:HK|hk)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇭🇰",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png`
    },
    澳门: {
      pattern: "澳门|\\b(?:MO|mo)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Macau|🇲🇴",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Macao.png`
    },
    台湾: {
      weight: 20,
      pattern: "台|新北|彰化|\\b(?:TW|tw)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇹🇼|🇼🇸",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png`
    },
    新加坡: {
      weight: 30,
      pattern: "新加坡|坡|狮城|\\b(?:SG|sg)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇸🇬",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Singapore.png`
    },
    日本: {
      weight: 40,
      pattern: "日本|川日|东京|大阪|泉日|埼玉|沪日|深日|\\b(?:JP|jp)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇯🇵",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Japan.png`
    },
    韩国: {
      weight: 45,
      pattern: "韩国|韩|韓|春川|Chuncheon|首尔|\\b(?:KR|kr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|ICN|🇰🇷",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Korea.png`
    },
    美国: {
      weight: 50,
      pattern: "美国|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|亚特兰大|迈阿密|华盛顿|\\b(?:US|us)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇺🇸",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/United_States.png`,
      excludePattern: "美属|亚美尼亚|圣多美|普林西比"
    },
    加拿大: {
      weight: 55,
      pattern: "加拿大|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|\\b(?:CA|ca)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|YVR|YYZ|YUL|🇨🇦",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Canada.png`
    },
    英国: {
      weight: 60,
      pattern: "英国|伦敦|曼彻斯特|Manchester|\\b(?:UK|uk)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Britain|United Kingdom|UNITED KINGDOM|England|GBR|LHR|MAN|🇬🇧",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png`
    },
    澳大利亚: {
      pattern: "澳洲|澳大利亚|\\b(?:AU|au)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Australia|🇦🇺",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Australia.png`
    },
    德国: {
      weight: 70,
      pattern: "德国|德|柏林|法兰克福|慕尼黑|Munich|\\b(?:DE|de)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Germany|GERMANY|DEU|MUC|🇩🇪",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Germany.png`,
      excludePattern: "瓜德罗普"
    },
    法国: {
      weight: 80,
      pattern: "法国|法|巴黎|马赛|Marseille|\\b(?:FR|fr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|CDG|MRS|🇫🇷",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/France.png`,
      excludePattern: "法属|布基纳法索|法罗"
    },
    俄罗斯: {
      pattern: "俄罗斯|俄|\\b(?:RU|ru)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Russia|🇷🇺",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Russia.png`,
      excludePattern: "埃塞俄比亚|白俄罗斯"
    },
    泰国: {
      pattern: "泰国|泰|\\b(?:TH|th)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Thailand|🇹🇭",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Thailand.png`,
      excludePattern: "巴泰"
    },
    印度: {
      pattern: "印度|\\b(?:IN|in)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|India|🇮🇳",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/India.png`,
      excludePattern: "印度洋"
    },
    马来西亚: {
      pattern: "马来西亚|马来|\\b(?:MY|my)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Malaysia|🇲🇾",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png`
    },
    阿根廷: {
      pattern: "阿根廷|布宜诺斯艾利斯|\\b(?:AR|ar)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Argentina|EZE|🇦🇷",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Argentina.png`
    },
    芬兰: {
      pattern: "芬兰|赫尔辛基|\\b(?:FI|fi)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Finland|HEL|🇫🇮",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Finland.png`
    },
    埃及: {
      pattern: "埃及|开罗|\\b(?:EG|eg)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Egypt|CAI|🇪🇬",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Egypt.png`
    },
    菲律宾: {
      pattern: "菲律宾|马尼拉|\\b(?:PH|ph)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Philippines|MNL|🇵🇭",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Philippines.png`
    },
    土耳其: {
      pattern: "土耳其|伊斯坦布尔|\\b(?:TR|tr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Turkey|Türkiye|IST|🇹🇷",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Turkey.png`
    },
    乌克兰: {
      pattern: "乌克兰|基辅|\\b(?:UA|ua)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Ukraine|KBP|🇺🇦",
      icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Ukraine.png`
    }
  };

  // src/proxy_groups.ts
  function buildGroupByType({
    name,
    icon,
    groupType,
    nodeSource
  }) {
    switch (groupType) {
      case 0:
        return { name, icon, type: "select", ...nodeSource };
      case 1:
        return {
          name,
          icon,
          type: "url-test",
          url: SPEEDTEST_URL,
          interval: 60,
          tolerance: 20,
          ...nodeSource
        };
      case 2:
        return {
          name,
          icon,
          type: "load-balance",
          strategy: "sticky-sessions",
          url: SPEEDTEST_URL,
          interval: 60,
          tolerance: 20,
          ...nodeSource
        };
    }
  }
  function buildProxyGroups({
    regexFilter,
    groupType,
    countryNames,
    countryNodes,
    lowCostNodes,
    landing,
    landingNodes,
    defaultProxies,
    defaultProxiesDirect,
    defaultSelector,
    defaultFallback,
    frontProxySelector
  }) {
    const hasTW = countryNames.includes("台湾");
    const hasHK = countryNames.includes("香港");
    const hasUS = countryNames.includes("美国");
    const groups = [
      {
        name: PROXY_GROUPS.SELECT,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
        type: "select",
        proxies: defaultSelector
      },
      {
        name: PROXY_GROUPS.MANUAL,
        icon: `${CDN_URL}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
        "include-all": true,
        type: "select"
      },
      landing ? {
        name: PROXY_GROUPS.FRONT_PROXY,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Area.png`,
        type: "select",
        proxies: frontProxySelector
      } : null,
      landing ? {
        name: PROXY_GROUPS.LANDING,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Airport.png`,
        type: "select",
        proxies: landingNodes.map((node) => node.name).filter(isNotNull)
      } : null,
      {
        name: PROXY_GROUPS.STATIC_RESOURCES,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.AI_SERVICE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.CRYPTO,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_1.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.APPLE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Apple_2.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.GOOGLE,
        icon: `${CDN_URL}/gh/Orz-3/mini@master/Color/Google.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.MICROSOFT,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Microsoft_Copilot.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.XBOX,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Xbox.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.GITHUB,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/GitHub.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.BILIBILI,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/bilibili.png`,
        type: "select",
        proxies: hasTW && hasHK ? ["DIRECT", `台湾节点`, `香港节点`] : defaultProxiesDirect
      },
      {
        name: PROXY_GROUPS.BAHAMUT,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png`,
        type: "select",
        proxies: hasTW ? [`台湾节点`, PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL, "DIRECT"] : defaultProxies
      },
      {
        name: PROXY_GROUPS.YOUTUBE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/YouTube.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.TWITCH,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Twitch.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.NETFLIX,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Netflix.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.TIKTOK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/TikTok.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.SPOTIFY,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Spotify.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.TELEGRAM,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Telegram.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.TWITTER,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Twitter.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.WEIBO,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Weibo.png`,
        type: "select",
        "include-all": true,
        proxies: defaultProxiesDirect
      },
      {
        name: PROXY_GROUPS.TRUTH_SOCIAL,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Truth_Social.png`,
        type: "select",
        proxies: hasUS ? [`美国节点`, PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL] : defaultProxies
      },
      {
        name: PROXY_GROUPS.EHENTAI,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Ehentai.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.PIKPAK,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/PikPak.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.SOGOU_INPUT,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Sougou.png`,
        type: "select",
        proxies: ["DIRECT", "REJECT"]
      },
      {
        name: PROXY_GROUPS.SSH,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Server.png`,
        type: "select",
        proxies: defaultProxies
      },
      {
        name: PROXY_GROUPS.AD_BLOCK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png`,
        type: "select",
        proxies: ["REJECT", "REJECT-DROP", "DIRECT"]
      },
      {
        name: PROXY_GROUPS.FINAL,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Final.png`,
        type: "select",
        proxies: [PROXY_GROUPS.SELECT, "DIRECT"]
      },
      {
        name: PROXY_GROUPS.AUTO,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
        type: "url-test",
        url: SPEEDTEST_URL,
        proxies: defaultFallback,
        interval: 60,
        tolerance: 20
      },
      {
        name: PROXY_GROUPS.FALLBACK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
        type: "fallback",
        url: SPEEDTEST_URL,
        proxies: defaultFallback,
        interval: 60,
        tolerance: 20
      },
      lowCostNodes.length > 0 || regexFilter ? buildGroupByType({
        name: PROXY_GROUPS.LOW_COST,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
        groupType,
        nodeSource: !regexFilter ? { proxies: lowCostNodes.map((node) => node.name).filter(isNotNull) } : { "include-all": true, filter: LOW_COST_NODE_MATCHER.pattern }
      }) : null,
      ...countryNames.map((country) => {
        const meta = countriesMeta[country];
        if (!meta) return null;
        const nodeSource = regexFilter ? {
          "include-all": true,
          filter: meta.pattern,
          ...meta.excludePattern ? { "exclude-filter": meta.excludePattern } : {}
        } : { proxies: countryNodes[country]?.map((n) => n.name).filter(isNotNull) };
        return buildGroupByType({
          name: `${country}${NODE_SUFFIX}`,
          icon: meta.icon,
          groupType,
          nodeSource
        });
      })
    ];
    return groups.filter(isNotNull);
  }

  // src/selectors.ts
  function buildBaseLists({
    landing,
    lowCostNodes,
    countryNames,
    nonLandingNodes,
    regexFilter
  }) {
    const suffixedCountryNames = countryNames.map((c) => c + NODE_SUFFIX);
    const lowCost = lowCostNodes.length > 0 || regexFilter;
    const defaultSelector = buildList(
      PROXY_GROUPS.AUTO,
      PROXY_GROUPS.FALLBACK,
      landing && PROXY_GROUPS.LANDING,
      suffixedCountryNames,
      lowCost && PROXY_GROUPS.LOW_COST,
      PROXY_GROUPS.MANUAL,
      "DIRECT"
    );
    const defaultProxies = buildList(
      PROXY_GROUPS.SELECT,
      landing && PROXY_GROUPS.LANDING,
      suffixedCountryNames,
      lowCost && PROXY_GROUPS.LOW_COST,
      PROXY_GROUPS.MANUAL,
      "DIRECT"
    );
    const defaultProxiesDirect = buildList(
      "DIRECT",
      landing && PROXY_GROUPS.LANDING,
      suffixedCountryNames,
      lowCost && PROXY_GROUPS.LOW_COST,
      PROXY_GROUPS.SELECT,
      PROXY_GROUPS.MANUAL
    );
    const defaultFallback = buildList(landing && PROXY_GROUPS.LANDING, suffixedCountryNames);
    const frontProxySelector = buildList(
      suffixedCountryNames,
      "DIRECT",
      !regexFilter && nonLandingNodes.map((node) => node.name).filter(Boolean)
    );
    return {
      defaultProxies,
      defaultProxiesDirect,
      defaultSelector,
      defaultFallback,
      frontProxySelector
    };
  }

  // src/node_parser.ts
  var COUNTRY_REGEX_MAP = Object.fromEntries(
    Object.entries(countriesMeta).map(([country, meta]) => {
      return [country, new RegExp(meta.pattern.replace(/^\(\?i\)/, ""))];
    })
  );
  var COUNTRY_EXCLUDE_MAP = Object.fromEntries(
    Object.entries(countriesMeta).filter(([, meta]) => meta.excludePattern).map(([country, meta]) => [country, new RegExp(meta.excludePattern)])
  );
  function parseLowCost(nodes) {
    return (nodes || []).filter((proxy) => LOW_COST_NODE_MATCHER.regex.test(proxy.name || ""));
  }
  function parseCountries(nodes) {
    const countryNodes = /* @__PURE__ */ Object.create(null);
    for (const node of nodes) {
      const name = node.name || "";
      for (const [country, regex] of Object.entries(COUNTRY_REGEX_MAP)) {
        if (!regex.test(name)) continue;
        if (COUNTRY_EXCLUDE_MAP[country]?.test(name)) continue;
        if (!countryNodes[country]) {
          countryNodes[country] = [];
        }
        countryNodes[country].push(node);
        break;
      }
    }
    return countryNodes;
  }
  function getActiveCountryNames(countryNodes, minCount) {
    const filtered = Object.entries(countryNodes).filter(([, nodes]) => nodes.length >= minCount);
    filtered.sort(([a], [b]) => {
      const wa = countriesMeta[a]?.weight ?? Infinity;
      const wb = countriesMeta[b]?.weight ?? Infinity;
      return wa - wb;
    });
    return filtered.map(([country]) => country);
  }

  // src/sing_box_rule_sets.ts
  var META_BASE = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo";
  var SKK_BASE = "https://ruleset.skk.moe/sing-box";
  var PROJECT_BASE = `${CDN_URL}/gh/chrofatey/override-rules@dist/ruleset/sing-box`;
  function binary(tag, url) {
    return { type: "remote", tag, format: "binary", url, update_interval: "1d" };
  }
  function source(tag, url) {
    return { type: "remote", tag, format: "source", url, update_interval: "1d" };
  }
  var geositeNames = [
    "category-ai-!cn",
    "bilibili",
    "youtube",
    "telegram",
    "xbox",
    "github",
    "netflix",
    "twitch",
    "spotify",
    "bahamut",
    "pikpak",
    "twitter",
    "google-play@cn",
    "microsoft@cn",
    "apple",
    "microsoft",
    "google",
    "gfw"
  ];
  var geoipNames = ["private", "telegram", "netflix", "cn"];
  var singBoxRuleSets = [
    binary(
      "ADBlock",
      "https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblocksingbox.srs"
    ),
    source("SogouInput", `${SKK_BASE}/non_ip/sogouinput.json`),
    source("StaticResources", `${SKK_BASE}/domainset/cdn.json`),
    source("CDNResources", `${SKK_BASE}/non_ip/cdn.json`),
    ...[
      "TikTok",
      "EHentai",
      "SteamFix",
      "GoogleFCM",
      "AdditionalFilter",
      "AdditionalCDNResources",
      "Crypto",
      "Weibo"
    ].map((tag) => binary(tag, `${PROJECT_BASE}/${tag}.srs`)),
    ...geositeNames.map((tag) => binary(`geosite-${tag}`, `${META_BASE}/geosite/${tag}.srs`)),
    ...geoipNames.map((tag) => binary(`geoip-${tag}`, `${META_BASE}/geoip/${tag}.srs`))
  ];

  // src/sing_box.ts
  var DIRECT = "direct";
  var MANAGED_STATIC_TAGS = /* @__PURE__ */ new Set([
    ...Object.values(PROXY_GROUPS),
    ...Object.keys(countriesMeta).map((country) => `${country}节点`)
  ]);
  function warn(message) {
    try {
      console.log(`[powerfullz 的 Sing-Box 覆写脚本] ${message}`);
    } catch {
    }
  }
  function normalizeMember(tag) {
    if (tag === "DIRECT") return DIRECT;
    if (tag === "REJECT" || tag === "REJECT-DROP") return null;
    return tag;
  }
  function routeTo(ruleSet, outbound) {
    return { rule_set: ruleSet, action: "route", outbound };
  }
  function buildRouteRules(flags2) {
    const rules = [
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" }
    ];
    if (!flags2.quicEnabled) {
      rules.push({
        type: "logical",
        mode: "and",
        rules: [{ network: "udp" }, { port: 443 }],
        action: "reject",
        method: "drop"
      });
    }
    rules.push({ port: 22, action: "route", outbound: PROXY_GROUPS.SSH });
    if (flags2.adBlockEnabled) {
      rules.push(
        { rule_set: "ADBlock", action: "reject" },
        { rule_set: "AdditionalFilter", action: "reject" }
      );
    }
    if (flags2.sogouBlockEnabled) {
      rules.push({ rule_set: "SogouInput", action: "reject" });
    }
    rules.push(
      {
        domain_suffix: ["truthsocial.com"],
        action: "route",
        outbound: PROXY_GROUPS.TRUTH_SOCIAL
      },
      routeTo("StaticResources", PROXY_GROUPS.STATIC_RESOURCES),
      routeTo("CDNResources", PROXY_GROUPS.STATIC_RESOURCES),
      routeTo("AdditionalCDNResources", PROXY_GROUPS.STATIC_RESOURCES),
      routeTo("geosite-category-ai-!cn", PROXY_GROUPS.AI_SERVICE),
      routeTo("geosite-bilibili", PROXY_GROUPS.BILIBILI),
      routeTo("geosite-youtube", PROXY_GROUPS.YOUTUBE),
      routeTo("geosite-telegram", PROXY_GROUPS.TELEGRAM),
      routeTo("geosite-xbox", PROXY_GROUPS.XBOX),
      routeTo("geosite-github", PROXY_GROUPS.GITHUB),
      routeTo("geosite-netflix", PROXY_GROUPS.NETFLIX),
      routeTo("geosite-twitch", PROXY_GROUPS.TWITCH),
      routeTo("geosite-spotify", PROXY_GROUPS.SPOTIFY),
      routeTo("geosite-bahamut", PROXY_GROUPS.BAHAMUT),
      routeTo("geosite-pikpak", PROXY_GROUPS.PIKPAK),
      routeTo("geosite-twitter", PROXY_GROUPS.TWITTER),
      routeTo("Weibo", PROXY_GROUPS.WEIBO),
      routeTo("EHentai", PROXY_GROUPS.EHENTAI),
      routeTo("TikTok", PROXY_GROUPS.TIKTOK),
      routeTo("SteamFix", DIRECT),
      routeTo("GoogleFCM", DIRECT),
      routeTo("geosite-google-play@cn", DIRECT),
      routeTo("geosite-microsoft@cn", DIRECT),
      routeTo("geosite-apple", PROXY_GROUPS.APPLE),
      routeTo("geosite-microsoft", PROXY_GROUPS.MICROSOFT),
      routeTo("geosite-google", PROXY_GROUPS.GOOGLE),
      routeTo("Crypto", PROXY_GROUPS.CRYPTO),
      routeTo("geosite-gfw", PROXY_GROUPS.SELECT),
      routeTo("geoip-private", DIRECT),
      routeTo("geoip-telegram", PROXY_GROUPS.TELEGRAM),
      routeTo("geoip-netflix", PROXY_GROUPS.NETFLIX),
      routeTo("geoip-cn", DIRECT)
    );
    return rules;
  }
  function buildDns(flags2) {
    const servers = [
      { type: "udp", tag: "local-dns", server: "223.5.5.5" },
      {
        type: "https",
        tag: "remote-dns",
        server: "dns.cloudflare.com",
        path: "/dns-query",
        domain_resolver: "local-dns",
        detour: PROXY_GROUPS.SELECT
      }
    ];
    const rules = [
      { rule_set: "geoip-private", action: "route", server: "local-dns" },
      { rule_set: "geosite-microsoft@cn", action: "route", server: "local-dns" },
      { rule_set: "geosite-google-play@cn", action: "route", server: "local-dns" }
    ];
    if (flags2.fakeIPEnabled) {
      servers.push({
        type: "fakeip",
        tag: "fakeip-dns",
        inet4_range: "198.18.0.0/15",
        ...flags2.ipv6Enabled ? { inet6_range: "fc00::/18" } : {}
      });
      rules.push({ query_type: ["A", "AAAA"], action: "route", server: "fakeip-dns" });
    }
    return {
      servers,
      rules,
      final: "remote-dns",
      strategy: flags2.ipv6Enabled ? "prefer_ipv4" : "ipv4_only",
      reverse_mapping: true
    };
  }
  function buildTunInbound() {
    return {
      type: "tun",
      tag: "tun-in",
      interface_name: "sing-box",
      address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
      mtu: 1500,
      auto_route: true,
      strict_route: true,
      stack: "system",
      route_exclude_address: [
        "100.64.0.0/10",
        "fd7a:115c:a1e0::/48",
        "192.168.0.0/16",
        "fd00::/8"
      ]
    };
  }
  function buildSingBoxConfig(config, flags2) {
    const inputOutbounds = Array.isArray(config.outbounds) ? config.outbounds : [];
    const inputEndpoints = Array.isArray(config.endpoints) ? config.endpoints : [];
    const protocolOutbounds = inputOutbounds.filter(
      (outbound) => outbound?.tag && outbound.tag !== DIRECT && !(MANAGED_STATIC_TAGS.has(outbound.tag) && ["selector", "urltest"].includes(outbound.type))
    );
    const protocolNodes = [...protocolOutbounds, ...inputEndpoints];
    if (protocolNodes.length === 0) {
      throw new Error(
        "[powerfullz 的 Sing-Box 覆写脚本] 错误：配置中缺少有效的代理 outbounds/endpoints"
      );
    }
    const nodes = protocolNodes.map((node) => ({
      ...node,
      name: node.tag,
      ...node.detour ? { "dialer-proxy": node.detour } : {}
    }));
    const landingNodes = nodes.filter((node) => node["dialer-proxy"] === PROXY_GROUPS.FRONT_PROXY);
    const nonLandingNodes = nodes.filter(
      (node) => node["dialer-proxy"] !== PROXY_GROUPS.FRONT_PROXY
    );
    const landing = landingNodes.length > 0 && nonLandingNodes.length > 0;
    const classifiedNodes = landing ? nonLandingNodes : nodes;
    const countryNodes = parseCountries(classifiedNodes);
    const lowCostNodes = parseLowCost(classifiedNodes);
    const countryNames = getActiveCountryNames(countryNodes, flags2.countryThreshold);
    const lists = buildBaseLists({
      landing,
      lowCostNodes,
      countryNames,
      nonLandingNodes,
      regexFilter: false
    });
    if (flags2.regexFilter)
      warn("regex=true 在 Sing-Box 动态输出中会被忽略，节点已按 tag 显式枚举。");
    if (flags2.groupType === 2)
      warn("Sing-Box 没有 load-balance outbound，grouptype=2 已降级为 urltest。");
    const clashGroups = buildProxyGroups({
      regexFilter: false,
      groupType: flags2.groupType,
      countryNames,
      countryNodes,
      lowCostNodes,
      landing,
      landingNodes,
      ...lists
    }).filter(
      (group) => group.name !== PROXY_GROUPS.AD_BLOCK && group.name !== PROXY_GROUPS.SOGOU_INPUT
    );
    const allNodeTags = protocolNodes.map((node) => node.tag);
    const strategyOutbounds = clashGroups.map((group) => {
      const members = (group.proxies ?? allNodeTags).map(normalizeMember).filter((tag) => Boolean(tag));
      if (group.type === "select") {
        return { type: "selector", tag: group.name, outbounds: members };
      }
      return {
        type: "urltest",
        tag: group.name,
        outbounds: members,
        url: group.url ?? SPEEDTEST_URL,
        interval: "1m",
        tolerance: group.tolerance ?? 20
      };
    });
    strategyOutbounds.push({
      type: "selector",
      tag: PROXY_GROUPS.GLOBAL,
      outbounds: strategyOutbounds.map((outbound) => outbound.tag)
    });
    const generatedTags = /* @__PURE__ */ new Set([DIRECT, ...strategyOutbounds.map((outbound) => outbound.tag)]);
    for (const node of protocolNodes) {
      if (generatedTags.has(node.tag)) {
        throw new Error(
          `[powerfullz 的 Sing-Box 覆写脚本] 错误：订阅节点 tag 与生成策略冲突：${node.tag}`
        );
      }
    }
    const inbounds = (Array.isArray(config.inbounds) ? config.inbounds : []).filter(
      (inbound) => inbound.tag !== "tun-in" && !(flags2.fullConfig && inbound.tag === "mixed-in")
    );
    if (flags2.fullConfig) {
      inbounds.push({ type: "mixed", tag: "mixed-in", listen: "0.0.0.0", listen_port: 7890 });
    }
    if (flags2.tunEnabled) inbounds.push(buildTunInbound());
    return {
      ...config,
      ...flags2.fullConfig ? { log: { level: "info", timestamp: true } } : {},
      inbounds,
      outbounds: [...protocolOutbounds, { type: "direct", tag: DIRECT }, ...strategyOutbounds],
      endpoints: inputEndpoints,
      dns: buildDns(flags2),
      route: {
        ...config.route ?? {},
        rules: buildRouteRules(flags2),
        rule_set: singBoxRuleSets,
        final: PROXY_GROUPS.FINAL,
        auto_detect_interface: true,
        default_domain_resolver: "local-dns"
      },
      ...flags2.fullConfig ? {
        experimental: {
          ...config.experimental ?? {},
          cache_file: { enabled: true, store_fakeip: flags2.fakeIPEnabled },
          clash_api: { external_controller: "127.0.0.1:9090" }
        }
      } : {}
    };
  }

  // src/main_sing_box.ts
  function getRawArgs() {
    try {
      return $arguments;
    } catch {
      return {};
    }
  }
  var flags = buildFeatureFlags(getRawArgs());
  function main(config) {
    return buildSingBoxConfig(config, flags);
  }
  function parseResponseBody(body) {
    const config = typeof body === "string" ? JSON.parse(body) : body;
    if (!config || Array.isArray(config) || typeof config !== "object") {
      throw new Error(
        "[powerfullz 的 Sing-Box 覆写脚本] 错误：响应内容不是 Sing-Box JSON 对象，请确认下载目标为 sing-box"
      );
    }
    return config;
  }
  function transformFunction(res) {
    return {
      ...res,
      body: `${JSON.stringify(main(parseResponseBody(res?.body)), null, 2)}
`
    };
  }
  globalThis.main = main;
  globalThis.transformFunction = transformFunction;
})();
