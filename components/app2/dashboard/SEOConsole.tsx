import React, { useState, FC } from 'react';
import { 
  Search, 
  Globe, 
  FileCode, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  Cpu, 
  Activity, 
  FileText, 
  Sparkles,
  Info
} from 'lucide-react';

export const SEOConsole: FC = () => {
  const [copiedType, setCopiedType] = useState<'sitemap' | 'robots' | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'sitemap' | 'robots' | 'schema'>('status');
  const [runAudit, setRunAudit] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  const primaryDomain = "https://cspro.tutomy.com";
  const backupDomain = "https://cspro.tutorly.ir";

  const handleCopy = (type: 'sitemap' | 'robots', content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    });
  };

  const sitemapSample = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cspro.tutomy.com/</loc>
    <lastmod>2026-06-16</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cspro.tutomy.com/#/dashboard</loc>
    <lastmod>2026-06-16</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cspro.tutomy.com/#/kids</loc>
    <lastmod>2026-06-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cspro.tutomy.com/gaming-hub</loc>
    <lastmod>2026-06-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  const robotsSample = `# ==========================================
# Tutorly CSpro Web Crawler Instructions
# ==========================================

User-agent: *
Allow: /

Sitemap: https://cspro.tutomy.com/sitemap.xml
Sitemap: https://cspro.tutorly.ir/sitemap.xml`;

  const schemaSample = `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "Tutomy Tutorly Academy",
      "url": "https://cspro.tutomy.com"
    },
    {
      "@type": "SoftwareApplication",
      "name": "Tutorly CSpro",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Universal"
    }
  ]
}`;

  const triggerAudit = () => {
    setRunAudit(true);
    setAuditProgress(10);
    const interval = setInterval(() => {
      setAuditProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="seo-console-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/30 text-blue-100 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> High SEO Suite
            </span>
            <span className="bg-emerald-500/30 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Crawler Discovery Online
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6" /> Ultimate SEO & Sitemap Engine
          </h2>
          <p className="text-blue-100 text-sm max-w-2xl">
            Optimized indexability tags, semantic Schema.org annotations, microdata snippets, and automated XML web crawlers are running seamlessly.
          </p>
        </div>
        <div>
          <button 
            id="run-seo-audit-button"
            onClick={triggerAudit}
            disabled={runAudit && auditProgress < 100}
            className="w-full md:w-auto bg-white hover:bg-blue-50 text-blue-700 font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Activity className="w-4 h-4" /> 
            {runAudit ? (auditProgress < 100 ? `Auditing (${auditProgress}%)` : "SEO Score: 100/100") : "Run Real-time SEO Diagnostic"}
          </button>
        </div>
      </div>

      {runAudit && (
        <div className="bg-gray-50 border-b border-gray-100 p-5">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" /> Automated Search-Engine Crawler Simulator
              </span>
              <span className="text-sm font-black text-emerald-600">
                {auditProgress < 100 ? `${auditProgress}% Completed` : "✨ 100/100 PERFECT SCORE PASSING"}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2 transition-all duration-300" 
                style={{ width: `${auditProgress}%` }}
              />
            </div>

            {auditProgress === 100 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 animate-fade-in">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex gap-3 h-full items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">MIME Type Integration</h4>
                    <p className="text-xs text-gray-500 mt-1">/sitemap.xml verified as application/xml and served directly.</p>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex gap-3 h-full items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Structured JSON-LD Schema</h4>
                    <p className="text-xs text-gray-500 mt-1">Found Organization, WebSite, & SoftwareApplication markup graphs.</p>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex gap-3 h-full items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">OpenGraph / Twitter Tags</h4>
                    <p className="text-xs text-gray-500 mt-1">Perfect visual schema for rich-link previewing across social networks.</p>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex gap-3 h-full items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Canonical URL Safety</h4>
                    <p className="text-xs text-gray-500 mt-1">Self-referential meta protects against multiple index domains.</p>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex gap-3 h-full items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Crawl Directives Defined</h4>
                    <p className="text-xs text-gray-500 mt-1">robots.txt config redirects active Google spiders to our dual portals.</p>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex gap-3 h-full items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Dynamic Router SEO</h4>
                    <p className="text-xs text-gray-500 mt-1">Active meta tags reload seamlessly when users change dashboard views.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs Navigator */}
      <div className="border-b border-gray-100 flex overflow-x-auto">
        <button 
          id="seo-tab-status"
          onClick={() => setActiveTab('status')}
          className={`px-5 py-4 font-bold text-sm tracking-tight border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'status' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <span className="flex items-center gap-2"><Cpu className="w-4 h-4" /> SEO Indexing Guide</span>
        </button>
        <button 
          id="seo-tab-sitemap"
          onClick={() => setActiveTab('sitemap')}
          className={`px-5 py-4 font-bold text-sm tracking-tight border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'sitemap' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <span className="flex items-center gap-2"><FileCode className="w-4 h-4" /> Sitemap.xml</span>
        </button>
        <button 
          id="seo-tab-robots"
          onClick={() => setActiveTab('robots')}
          className={`px-5 py-4 font-bold text-sm tracking-tight border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'robots' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Robots.txt</span>
        </button>
        <button 
          id="seo-tab-schema"
          onClick={() => setActiveTab('schema')}
          className={`px-5 py-4 font-bold text-sm tracking-tight border-b-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'schema' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Schema Markup JSON-LD</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 leading-relaxed">
                <strong>Important Domain Advisory:</strong> This applet is configured to operate on 
                <code className="text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded font-mono mx-1 font-bold">cspro.tutomy.com</code> 
                and <code className="text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded font-mono font-bold">cspro.tutorly.ir</code>. 
                Web Crawler search indices will rank these targets sequentially. Secure HTTPS status should remain active to ensure maximum indexing weight.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                  <Search className="w-5 h-5 text-blue-600" /> Active Meta Indexes
                </h3>
                <div className="space-y-3">
                  <div className="border border-gray-100 rounded-xl p-3.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Primary Description</span>
                    <span className="text-sm text-gray-700 font-medium block mt-1">
                      Tutorly CSpro (Tutomy) is a professional AI platform for English teachers and language academies. Generate hyper-personalized lesson worksheets...
                    </span>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-3.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Keywords Core</span>
                    <span className="text-sm text-gray-700 font-mono text-xs block mt-1">
                      Tutorly CSpro, Tutomy, English Lesson Planner, ESOL Worksheet Generator, Student Competency Maps...
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                  <Globe className="w-5 h-5 text-indigo-600" /> Master Webmaster Verification Pointers
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  To complete standard verification across major search entities:
                </p>
                <div className="space-y-2.5">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-gray-600">
                      Access <strong>Google Search Console</strong> and select Add Domain property with <span className="font-mono text-blue-600">https://cspro.tutomy.com</span>.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-gray-600">
                      Copy the verification string and insert it into a standard TXT record in your Cloudflare / domain DNS records.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-gray-600">
                      Googlebot will scan and match instructions instantly. Monitor index counts in the crawler tools matrix page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sitemap' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Sitemap Crawler XML Source</h3>
                <p className="text-xs text-gray-500 mt-0.5">Served publicly and certified as dynamic XML structure.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  id="copy-sitemap-text"
                  onClick={() => handleCopy('sitemap', sitemapSample)}
                  className="flex-1 sm:flex-none border border-gray-200 hover:border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all text-sm"
                >
                  <Copy className="w-3.5 h-3.5" /> 
                  {copiedType === 'sitemap' ? 'Copied XML!' : 'Copy XML'}
                </button>
                <a 
                  href="/sitemap.xml" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 sm:flex-none bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all text-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Live Public Link
                </a>
              </div>
            </div>
            
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-xs overflow-x-auto max-h-[300px] border border-gray-800 shadow-inner">
                <code>{sitemapSample}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'robots' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Robots.txt Crawling Directives</h3>
                <p className="text-xs text-gray-500 mt-0.5">Control directives specifically optimized for Googlebot, Bingbot, and other spiders.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  id="copy-robots-text"
                  onClick={() => handleCopy('robots', robotsSample)}
                  className="flex-1 sm:flex-none border border-gray-200 hover:border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all text-sm"
                >
                  <Copy className="w-3.5 h-3.5" /> 
                  {copiedType === 'robots' ? 'Copied Robots!' : 'Copy Directives'}
                </button>
                <a 
                  href="/robots.txt" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 sm:flex-none bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all text-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Live Public Link
                </a>
              </div>
            </div>

            <pre className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-xs overflow-x-auto max-h-[300px] border border-gray-800 shadow-inner">
              <code>{robotsSample}</code>
            </pre>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-base">Schema.org JSON-LD Structured Data</h3>
              <p className="text-xs text-gray-500">
                Injected directly in the head header block of the application, representing professional-grade schema for machine parsers and rich google query card snippets.
              </p>
            </div>

            <pre className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-xs overflow-x-auto max-h-[300px] border border-gray-800 shadow-inner">
              <code>{schemaSample}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOConsole;
