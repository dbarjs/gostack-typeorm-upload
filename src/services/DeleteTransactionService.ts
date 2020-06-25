import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getRepository('transactions');
    const transaction = await transactionsRepository.findOne(id);

    if (!transaction) {
      throw new AppError('Transaction not found.', 404);
    }

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
