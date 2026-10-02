import CartContents from '@/components/commerce/CartContents';
import { Breadcrumbs } from '@/components/Ui';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Shopping bag',
  description: 'Review your NashRoam shopping bag.',
  path: '/cart/',
  noindex: true,
});

export default function CartPage() {
  return (
    <div className="shell pb-20">
      <Breadcrumbs
        trail={[
          { name: 'Shop', href: '/shop/' },
          { name: 'Shopping bag', href: '/cart/' },
        ]}
      />
      <div className="mx-auto max-w-3xl py-10">
        <p className="eyebrow text-clay">NashRoam Goods</p>
        <h1 className="mt-2 font-sans text-3xl font-bold text-ink sm:text-4xl">Shopping bag</h1>
        <div className="mt-8 rounded-card border border-paper-edge bg-paper-card p-5 sm:p-8">
          <CartContents />
        </div>
      </div>
    </div>
  );
}
