import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async (context) => {
  const reports = await getCollection('reports');
  const siteUrl = (context.site?.toString() || 'https://equisight-alpha.com').replace(/\/$/, '');

  const sortedReports = reports.sort(
    (a: any, b: any) => new Date(b.data.publishDate).getTime() - new Date(a.data.publishDate).getTime()
  ).slice(0, 50);

  const rssItems = sortedReports.map((report: any) => `
    <item>
      <title><![CDATA[${report.data.title}]]></title>
      <link>${siteUrl}/reports/${report.slug}</link>
      <guid isPermaLink="true">${siteUrl}/reports/${report.slug}</guid>
      <pubDate>${new Date(report.data.publishDate).toUTCString()}</pubDate>
      <description><![CDATA[${report.data.description}]]></description>
      <category><![CDATA[${report.data.sector}]]></category>
      <category><![CDATA[${report.data.ticker}]]></category>
      <category><![CDATA[${report.data.region} Equities]]></category>
    </item>
  `).join('');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EquiSight Alpha - Evidence-Based Equity Intelligence</title>
    <link>${siteUrl}</link>
    <description>Daily institutional fundamental equity research reports covering US and European market movers.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

  return new Response(xmlContent.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
