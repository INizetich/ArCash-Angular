export default interface Transaction {
  id: number;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: Date;
  from?: string;
  to?: string;
  status?: 'COMPLETED' | 'FAILED';
}