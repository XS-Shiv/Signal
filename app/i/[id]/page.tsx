import { Shell } from '@/components/Shell';
import { Detail } from '@/components/detail';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Shell><Detail id={id} /></Shell>;
}
