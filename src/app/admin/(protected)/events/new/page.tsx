import { requirePagePermission } from '@/lib/auth/permissions';
import { EventCreateClient } from './EventCreateClient';

export default async function NewEventPage() {
  await requirePagePermission('events.manage');

  return <EventCreateClient />;
}
