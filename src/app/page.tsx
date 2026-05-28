'use client';

import { useState } from 'react';
import { Loader2, Search, CheckCircle, AlertTriangle, XCircle, Info, ExternalLink, Download } from 'lucide-react';
import { AuditResult, EvaluationCheck } from '@/lib/audit/types';

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (status === 'warn') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  if (status === 'fail') return <XCircle className="w-5 h-5 text-rose-500" />;
  return <Info className="w-5 h-5 text-slate-400" />;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);
    setResult(null);
    setError('');
    setProgressMsg('Initializing audit...');

    try {
      const response = await fetch(`/api/audit?url=${encodeURIComponent(targetUrl)}`);
      if (!response.ok) throw new Error('Failed to start audit');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No stream available');

      let currentResult = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.status === 'info') {
                setProgressMsg(data.message);
              } else if (data.status === 'error') {
                throw new Error(data.message);
              } else if (data.status === 'complete') {
                currentResult = data.result;
              }
            } catch (e) {}
          }
        }
      }
      
      if (currentResult) {
        setResult(currentResult);
      } else {
        setError('Audit completed but no result was returned.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during the audit');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const scorableChecks = result?.categories.flatMap(c => c.checks).filter(c => c.status !== 'manual' && c.status !== 'unavailable') || [];
  const manualChecks = result?.categories.flatMap(c => c.checks).filter(c => c.status === 'manual' || c.status === 'unavailable') || [];

  const prioritizedActions = scorableChecks
    .filter(c => c.status === 'fail' || c.status === 'warn')
    .sort((a, b) => {
      const impactScore = { high: 3, med: 2, low: 1 };
      const effortScore = { low: 3, med: 2, high: 1 }; // low effort = high priority
      
      const aScore = (impactScore[a.impact as keyof typeof impactScore] * 2) + effortScore[a.effort as keyof typeof effortScore];
      const bScore = (impactScore[b.impact as keyof typeof impactScore] * 2) + effortScore[b.effort as keyof typeof effortScore];
      
      return bScore - aScore;
    });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              AEO Audit Tool
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              Analyze your website's visibility in AI answer engines (ChatGPT, Perplexity, Gemini). 
              Real, evidence-based signals with zero hallucination.
            </p>
            
            <form onSubmit={handleAudit} className="mt-8 flex gap-3 max-w-xl mx-auto print:hidden">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="block w-full rounded-lg border-0 py-3 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-lg sm:leading-6 bg-white"
                  placeholder="https://example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Run Audit'}
              </button>
            </form>

            {loading && (
              <div className="mt-6 flex flex-col items-center text-slate-600">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-medium animate-pulse">{progressMsg}</p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error running audit</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Header section with Score */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-48 h-48 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-slate-100 stroke-current"
                  strokeWidth="8"
                  cx="50" cy="50" r="40" fill="transparent"
                />
                <circle
                  className={`${getScoreColor(result.overallScore)} transition-all duration-1000 ease-out`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50" cy="50" r="40" fill="transparent"
                  strokeDasharray={`${result.overallScore * 2.51} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tracking-tighter text-slate-900">{result.overallScore}</span>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">AEO Score</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Executive Summary</h2>
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm mt-1 print:hidden">
                    {result.url} <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="hidden print:block text-slate-600 text-sm mt-1">
                    Target URL: {result.url}
                  </div>
                </div>
                <button 
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 print:hidden"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Report
                </button>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                {result.executiveSummary.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Category Scorecards */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Category Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {result.categories.map((cat, i) => {
                const passCount = cat.checks.filter(c => c.status === 'pass').length;
                const warnCount = cat.checks.filter(c => c.status === 'warn').length;
                const failCount = cat.checks.filter(c => c.status === 'fail').length;
                
                return (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-tight h-10">{cat.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Weight: {cat.weight}%</p>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div className="text-2xl font-bold text-slate-900">{Math.round(cat.score)}<span className="text-sm font-normal text-slate-500">/{cat.maxScore}</span></div>
                      <div className="flex gap-2">
                        {passCount > 0 && <span className="flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md"><CheckCircle className="w-3 h-3 mr-1"/>{passCount}</span>}
                        {warnCount > 0 && <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md"><AlertTriangle className="w-3 h-3 mr-1"/>{warnCount}</span>}
                        {failCount > 0 && <span className="flex items-center text-xs font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md"><XCircle className="w-3 h-3 mr-1"/>{failCount}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prioritized Action Plan */}
          {prioritizedActions.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-6">Prioritized Action Plan</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidence Found</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {prioritizedActions.map((action, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={action.status} />
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 capitalize">Impact: {action.impact}</span>
                              <span className="text-slate-500 capitalize">Effort: {action.effort}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-sm font-medium text-slate-900">
                          {action.title}
                          <div className="text-xs text-slate-500 font-normal mt-0.5">{action.category}</div>
                        </td>
                        <td className="py-4 px-3 text-sm text-slate-600 font-mono text-xs max-w-xs break-words">
                          {action.evidence}
                        </td>
                        <td className="py-4 px-3 text-sm text-slate-900 max-w-md">
                          {action.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Needs Manual Verification */}
          {manualChecks.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Info className="w-6 h-6 text-blue-500" />
                Needs Manual Verification
              </h3>
              <p className="text-slate-500 mb-4 text-sm print:hidden">
                The following checks could not be verified automatically or require human review. They do not negatively impact your AEO score.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manualChecks.map((check, i) => (
                  <div key={i} className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                    <h4 className="font-semibold text-blue-900">{check.title}</h4>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mt-1 mb-3">{check.category}</p>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p><strong>Evidence/Result:</strong> <span className="font-mono text-xs">{check.evidence}</span></p>
                      <p><strong>To-Do:</strong> {check.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      )}
    </main>
  );
}
