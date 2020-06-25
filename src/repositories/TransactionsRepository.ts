import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    return transactions.reduce(
      (balance, { value, type }) => ({
        income: type === 'income' ? balance.income + value : balance.income,
        outcome: type === 'outcome' ? balance.outcome + value : balance.outcome,
        total:
          type === 'income' ? balance.total + value : balance.total - value,
      }),
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
  }
}

export default TransactionsRepository;
