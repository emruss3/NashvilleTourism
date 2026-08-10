import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Canonical Place Review | Nashroam Admin', robots: { index: false, follow: false } };

type Row = {
  id: string; slug: string; name: string; primary_category: string; address_line1: string | null;
  neighborhood_name: string | null; website_url: string | null; official_source_url: string | null;
  confidence_score: number | null; needs_review: boolean | null; official_business_status: string | null;
  cuisine: string[] | null; price_level: number | null; reservation_url: string | null;
};

const CATEGORIES = ['restaurant','venue','attraction','park','bar-nightlife','coffee','shopping','lodging'];

export default async function CanonicalPlaceReview({ searchParams }: { searchParams?: { category?: string; approved?: string; rejected?: string; error?: string; id?: string } }) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?error=not-configured');
  if (!hasAdminSession()) redirect('/admin/login');
  const client = getSupabaseServiceClient();
  if (!client) redirect('/admin/login?error=not-configured');

  const category = searchParams?.category || 'restaurant';
  let query = client.from('place_curation_queue')
    .select('id,slug,name,primary_category,address_line1,neighborhood_name,website_url,official_source_url,confidence_score,needs_review,official_business_status,cuisine,price_level,reservation_url,curation_status')
    .eq('curation_status','pending')
    .order('confidence_score',{ ascending:false })
    .order('name')
    .limit(100);
  if (category !== 'all') query = query.eq('primary_category', category);

  const [queueResult, pendingResult, approvedResult] = await Promise.all([
    query,
    client.from('places').select('id',{ count:'exact',head:true }).eq('curation_status','pending'),
    client.from('places').select('id',{ count:'exact',head:true }).eq('curation_status','approved'),
  ]);
  const rows = (queueResult.data ?? []) as Row[];
  const notice = searchParams?.approved ? 'Place approved and published.' : searchParams?.rejected ? 'Place rejected.' : searchParams?.error ? `Action failed: ${searchParams.error}` : undefined;

  return (
    <main className="shell pb-20 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge pb-6">
        <div>
          <p className="eyebrow">Internal · Editorial</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy md:text-4xl">Canonical place review</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">Durable identity is already verified. Publishing still requires a human Nashroam score, summary, local note and planner fit.</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin/experiences" className="text-navy hover:text-clay">Experiences</Link>
            <Link href="/admin/places" className="text-navy hover:text-clay">FSQ staging</Link>
            <span className="text-ink-faint">Canonical places</span>
            <Link href="/admin/sources" className="text-navy hover:text-clay">Sources</Link>
          </div>
        </div>
        <form action="/api/admin/session" method="post"><input type="hidden" name="action" value="logout"/><button className="min-h-[40px] rounded-lg border border-paper-edge bg-white px-4 text-sm font-semibold text-navy">Sign out</button></form>
      </div>

      {notice ? <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${searchParams?.error ? 'border-red-200 bg-red-50 text-red-800':'border-green-200 bg-green-50 text-green-800'}`}>{notice}</div> : null}

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card"><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">All pending</p><p className="mt-2 text-3xl font-bold text-navy">{pendingResult.count ?? 0}</p></div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card"><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Approved</p><p className="mt-2 text-3xl font-bold text-navy">{approvedResult.count ?? 0}</p></div>
        <div className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card"><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Showing</p><p className="mt-2 text-3xl font-bold text-navy">{rows.length}</p></div>
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {['restaurant','venue','attraction','park','all'].map((c) => <Link key={c} href={`/admin/places/canonical?category=${c}`} className={`rounded-full border px-3 py-1.5 text-sm ${category===c?'border-clay bg-clay text-white':'border-paper-edge bg-white text-ink-soft'}`}>{c}</Link>)}
      </nav>

      <section className="mt-6 space-y-5">
        {rows.map((item) => (
          <article key={item.id} className="rounded-card border border-paper-edge bg-paper-card p-5 shadow-card md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-clay">{item.primary_category} · confidence {item.confidence_score ?? 0}</p>
                <h2 className="mt-1 font-sans text-xl font-bold text-navy">{item.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{item.neighborhood_name || 'Neighborhood unassigned'} · {item.address_line1 || 'Address unavailable'}</p>
                <p className="mt-1 text-xs text-ink-faint">Official state: {item.official_business_status || '—'}</p>
              </div>
              <div className="flex gap-3 text-sm font-semibold">
                {item.website_url ? <a href={item.website_url} target="_blank" rel="noreferrer" className="text-navy hover:text-clay">Website ↗</a> : null}
                {item.official_source_url ? <a href={item.official_source_url} target="_blank" rel="noreferrer" className="text-navy hover:text-clay">Verification ↗</a> : null}
              </div>
            </div>

            <details className="mt-5 rounded-lg border border-paper-edge bg-white p-4" open={searchParams?.id===item.id}>
              <summary className="cursor-pointer font-semibold text-navy">Editorial review</summary>
              <form action={`/api/admin/canonical-places/${item.id}/approve`} method="post" className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-navy">Nashroam score<input name="nashroamScore" type="number" min="0" max="100" required className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                <label className="text-sm font-semibold text-navy">Planner priority<input name="plannerPriority" type="number" min="0" max="100" required className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                <label className="md:col-span-2 text-sm font-semibold text-navy">Public summary<textarea name="summary" rows={2} required placeholder="Concise factual Nashroam description." className="mt-1 w-full rounded-lg border border-paper-edge p-3"/></label>
                <label className="md:col-span-2 text-sm font-semibold text-navy">Local note<textarea name="localNote" rows={3} required placeholder="Why go, who it works for, and the honest tradeoff." className="mt-1 w-full rounded-lg border border-paper-edge p-3"/></label>
                <label className="text-sm font-semibold text-navy">Best for<input name="bestFor" placeholder="date night, foodies, groups" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                <label className="text-sm font-semibold text-navy">Traveler types<input name="travelerTypes" placeholder="couples, first-visit, food" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                <label className="text-sm font-semibold text-navy">Vibe<input name="vibe" placeholder="lively, polished, intimate" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                <label className="text-sm font-semibold text-navy">Typical duration (minutes)<input name="typicalDurationMinutes" type="number" min="15" max="720" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                {item.primary_category==='restaurant' ? <>
                  <label className="text-sm font-semibold text-navy">Cuisine<input name="cuisine" placeholder="Italian, New American" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                  <label className="text-sm font-semibold text-navy">Price level<select name="priceLevel" defaultValue="" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge bg-white px-3"><option value="">Unknown</option><option value="1">$</option><option value="2">$$</option><option value="3">$$$</option><option value="4">$$$$</option></select></label>
                  <label className="text-sm font-semibold text-navy">Meal periods<input name="mealPeriods" placeholder="lunch, dinner, brunch" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                  <label className="text-sm font-semibold text-navy">Reservation URL<input name="reservationUrl" type="url" placeholder="https://..." className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge px-3"/></label>
                </> : null}
                {(['familyFriendly','groupFriendly','reservationRecommended'] as const).map((name) => <label key={name} className="text-sm font-semibold text-navy">{name.replace(/([A-Z])/g,' $1')}<select name={name} defaultValue="" className="mt-1 min-h-[42px] w-full rounded-lg border border-paper-edge bg-white px-3"><option value="">Not rated</option><option value="true">Yes</option><option value="false">No</option></select></label>)}
                <label className="md:col-span-2 text-sm font-semibold text-navy">Internal curation notes<textarea name="curationNotes" rows={2} className="mt-1 w-full rounded-lg border border-paper-edge p-3"/></label>
                <div className="md:col-span-2"><button className="btn-primary min-h-[44px]">Approve + publish</button></div>
              </form>
              <form action={`/api/admin/canonical-places/${item.id}/reject`} method="post" className="mt-5 border-t border-paper-edge pt-4"><label className="text-sm font-semibold text-navy">Reject / exclude<div className="mt-2 flex gap-2"><input name="curationNotes" required placeholder="Reason" className="min-h-[42px] flex-1 rounded-lg border border-paper-edge px-3"/><button className="rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800">Reject</button></div></label></form>
            </details>
          </article>
        ))}
        {rows.length===0 ? <div className="rounded-card border border-paper-edge bg-paper-card p-8 text-center text-ink-soft">No pending places in this category.</div> : null}
      </section>
    </main>
  );
}
