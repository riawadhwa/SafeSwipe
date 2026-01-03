import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RecentTransactions({ transactions = [] }) {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto">
                {/* Transactions list */}
            </div>
        </Card>
    );
}
