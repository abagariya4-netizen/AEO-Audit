import { collectEvidence } from '@/lib/audit/collect';
import { evaluateEvidence } from '@/lib/audit/evaluate';
import { calculateScore } from '@/lib/audit/score';
import { synthesizeResults } from '@/lib/audit/synthesize';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlStr = searchParams.get('url');

  if (!urlStr) {
    return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ status: 'info', message: 'Starting audit...' });
        
        const evidence = await collectEvidence(urlStr, (msg) => {
           send({ status: 'info', message: msg });
        });

        send({ status: 'info', message: 'Evaluating evidence...' });
        const checks = evaluateEvidence(evidence);
        
        send({ status: 'info', message: 'Calculating scores...' });
        const { categories, overallScore } = calculateScore(checks);
        
        send({ status: 'info', message: 'Synthesizing final report...' });
        const executiveSummary = await synthesizeResults(categories, overallScore, urlStr);
        
        const finalResult = {
          url: urlStr,
          overallScore,
          categories,
          executiveSummary
        };
        
        send({ status: 'complete', result: finalResult });
      } catch (err: any) {
        send({ status: 'error', message: err.message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
