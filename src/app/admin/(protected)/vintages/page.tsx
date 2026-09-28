import React from 'react';
import { VintagesClient } from './VintagesClient';

export const metadata = {
  title: 'Vintages Library & Cellar Inventory | VINORA Admin',
  description: 'Master list of estate vintages, inventory reserves, sensory benchmarks, and cellar availability',
};

export default function AdminVintagesPage() {
  return <VintagesClient />;
}
