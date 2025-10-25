const fs = require("fs");
const path = require("path");
const root = process.cwd();

const pages = [
  {
    src: "millian/landingpage-example.html",
    out: "components/marketing/revbeam-landing.tsx",
    component: "RevbeamLandingPage",
    slug: "millian-landing",
  },
  {
    src: "millian/social-media-lead-generation.html",
    out: "app/(marketing)/social-media-lead-generation/page.tsx",
    component: "RevbeamSocialMediaLeadGenerationPage",
    slug: "millian-social-media-lead-generation",
  },
  {
    src: "millian/affiliate-marketing.html",
    out: "app/(marketing)/affiliate-marketing/page.tsx",
    component: "RevbeamAffiliateMarketingPage",
    slug: "millian-affiliate-marketing",
  },
  {
    src: "millian/automations.html",
    out: "app/(marketing)/software-automations/page.tsx",
    component: "RevbeamSoftwareAutomationsPage",
    slug: "millian-software-automations",
  },
  {
    src: "millian/for-creators.html",
    out: "app/(marketing)/solutions/creators/page.tsx",
    component: "RevbeamSolutionsCreatorsPage",
    slug: "millian-solutions-creators",
  },
  {
    src: "millian/for-affiliates.html",
    out: "app/(marketing)/solutions/affiliates/page.tsx",
    component: "RevbeamSolutionsAffiliatesPage",
    slug: "millian-solutions-affiliates",
  },
  {
    src: "millian/cranads.html",
    out: "app/(marketing)/cranads/page.tsx",
    component: "RevbeamCranadsPage",
    slug: "millian-cranads",
  },
  {
    src: "millian/book-demo.html",
    out: "app/(marketing)/book-demo/page.tsx",
    component: "RevbeamBookDemoPage",
    slug: "millian-book-demo",
  },
  {
    src: "millian/get-started.html",
    out: "app/(marketing)/get-started/page.tsx",
    component: "RevbeamGetStartedPage",
    slug: "millian-get-started",
  },
];

const getBetween = (source, start, end, fromIndex = 0) => {
  const startIndex = source.indexOf(start, fromIndex);
  if (startIndex === -1) {
    return "";
  }
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    return "";
  }
  return source.slice(startIndex + start.length, endIndex);
};

const replaceLinks = (html) => {
  let result = html;
  const replacements = [
    { pattern: /href="\/contact"/g, value: 'href="/book-demo"' },
  ];
  replacements.forEach(({ pattern, value }) => {
    result = result.replace(pattern, value);
  });
  result = result.replace(
    /href="\/book-demo"([^>]*>Get Started<\/a>)/g,
    'href="/get-started"$1',
  );
  result = result.replace(
    /href="\/book-demo"([^>]*>Get started<\/a>)/g,
    'href="/get-started"$1',
  );
  return result;
};

const brandingTextReplacements = [
  {
    pattern: /Powered by our CranAds suite\./g,
    value: "Powered by the Revbeam automation stack.",
  },
  { pattern: /Visit CranAds\.com →/g, value: "Visit Revbeam →" },
  { pattern: /Explore CranAds/g, value: "Explore Revbeam Platform" },
  {
    pattern: /CranAds Software Suite/gi,
    value: "Revbeam Automation Platform",
  },
  { pattern: /CranAds Suite/gi, value: "Revbeam Platform" },
  { pattern: /CranAds/gi, value: "Revbeam Platform" },
];

const replaceBrandingText = (value = "") => {
  if (!value) {
    return value;
  }
  let result = value;
  brandingTextReplacements.forEach(({ pattern, value: replacement }) => {
    result = result.replace(pattern, replacement);
  });
  return result;
};

const replaceBrandingHtml = (html = "") => {
  let result = replaceBrandingText(html);
  result = result.replace(
    /href="https:\/\/cranads\.com"[^>]*class="btn btn-ghost"/g,
    'href="/book-demo" class="btn btn-ghost"',
  );
  return result;
};

pages.forEach(({ src, out, component, slug }) => {
  const html = fs.readFileSync(path.join(root, src), "utf8");
  const css = getBetween(html, "<style>", "</style>");
  const jsonLdRaw = getBetween(
    html,
    '<script type="application/ld+json">',
    "</script>",
  );
  const bodySection = getBetween(html, "<body>", "</body>");
  let bodyHtml = bodySection;
  let scriptContent = "";
  const scriptIndex = bodySection.indexOf("<script>");
  if (scriptIndex !== -1) {
    const scriptEnd = bodySection.indexOf("</script>", scriptIndex);
    if (scriptEnd !== -1) {
      scriptContent = bodySection.slice(
        scriptIndex + "<script>".length,
        scriptEnd,
      );
      bodyHtml =
        bodySection.slice(0, scriptIndex) +
        bodySection.slice(scriptEnd + "</script>".length);
    }
  }
  const kinsIndex = bodyHtml.indexOf('<div id="kins');
  if (kinsIndex !== -1) {
    bodyHtml = bodyHtml.slice(0, kinsIndex);
  }
  const footerIndex = bodyHtml.indexOf("</footer>");
  if (footerIndex !== -1) {
    bodyHtml = bodyHtml.slice(0, footerIndex + "</footer>".length);
  }
  bodyHtml = replaceLinks(bodyHtml);
  bodyHtml = replaceBrandingHtml(bodyHtml);
  bodyHtml = bodyHtml.trim();

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const descriptionMatch = html.match(
    /<meta name="description" content="([^"]*)"/i,
  );
  const urlMatch = html.match(/<meta property="og:url" content="([^"]*)"/i);

  const rawTitle = titleMatch ? titleMatch[1].trim() : "Millian.ai";
  const rawDescription = descriptionMatch ? descriptionMatch[1].trim() : "";
  const pageTitle = replaceBrandingText(rawTitle);
  const pageDescription = replaceBrandingText(rawDescription);
  const pageUrl = urlMatch ? urlMatch[1].trim() : "https://millian.ai/";

  let jsonLdObject = {};
  if (jsonLdRaw) {
    try {
      jsonLdObject = JSON.parse(jsonLdRaw);
    } catch (error) {
      jsonLdObject = {};
    }
  }
  const jsonLdString = replaceBrandingText(JSON.stringify(jsonLdObject, null, 2));
  const jsonLdLines = jsonLdString.split("\n");

  const lines = [];
  lines.push('import type { Metadata } from "next";');
  lines.push('import Script from "next/script";');
  lines.push("");
  lines.push("const pageStyles = " + JSON.stringify(css) + ";");
  lines.push("");
  lines.push("const pageHtml = " + JSON.stringify(bodyHtml) + ";");
  lines.push("");
  lines.push("const pageScript = " + JSON.stringify(scriptContent) + ";");
  lines.push("");
  if (jsonLdLines.length === 1) {
    lines.push("const jsonLd = " + jsonLdLines[0] + " as const;");
  } else {
    lines.push("const jsonLd = " + jsonLdLines[0]);
    for (let i = 1; i < jsonLdLines.length - 1; i += 1) {
      lines.push("  " + jsonLdLines[i]);
    }
    lines.push(jsonLdLines[jsonLdLines.length - 1] + " as const;");
  }
  lines.push("");
  lines.push("const pageTitle = " + JSON.stringify(pageTitle) + ";");
  lines.push(
    "const pageDescription = " + JSON.stringify(pageDescription) + ";",
  );
  lines.push("const pageUrl = " + JSON.stringify(pageUrl) + ";");
  lines.push("");
  lines.push("export const metadata: Metadata = {");
  lines.push("  title: pageTitle,");
  lines.push("  description: pageDescription,");
  lines.push("  openGraph: {");
  lines.push("    title: pageTitle,");
  lines.push("    description: pageDescription,");
  lines.push("    url: pageUrl,");
  lines.push('    type: "website",');
  lines.push("  },");
  lines.push("  twitter: {");
  lines.push('    card: "summary_large_image",');
  lines.push("    title: pageTitle,");
  lines.push("    description: pageDescription,");
  lines.push("  },");
  lines.push("};");
  lines.push("");
  lines.push("export default function " + component + "() {");
  lines.push("  return (");
  lines.push("    <>");
  lines.push("      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />");
  lines.push("      <div dangerouslySetInnerHTML={{ __html: pageHtml }} />");
  lines.push(
    '      <Script id="' + slug + '-script" strategy="afterInteractive">',
  );
  lines.push("        {pageScript}");
  lines.push("      </Script>");
  lines.push("      <Script");
  lines.push('        id="' + slug + '-jsonld"');
  lines.push('        type="application/ld+json"');
  lines.push('        strategy="afterInteractive"');
  lines.push("      >");
  lines.push("        {JSON.stringify(jsonLd)}");
  lines.push("      </Script>");
  lines.push("    </>");
  lines.push("  );");
  lines.push("}");
  lines.push("");
  const outputPath = path.join(root, out);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"));
});
