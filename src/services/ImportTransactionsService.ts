import fs from 'fs';
import parse from 'csv-parse/lib/sync';
import path from 'path';
import { getCustomRepository, getRepository, In } from 'typeorm';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category?: string;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // parse csv file
    const filePath = path.resolve(uploadConfig.directory, filename);
    const file = await fs.promises.readFile(filePath);
    const parsedCSV: CSVTransaction[] = parse(file, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // remove not compatible transactions
    const parsedTransactions = parsedCSV.filter(
      ({ title, type, value }) => title && type && value,
    );

    // get categories titles
    const parsedCategoriesTitles = parsedTransactions.map(
      transaction => transaction.category,
    );

    // get existent categories in database
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(parsedCategoriesTitles),
      },
    });

    // get categories titles from existent categories
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // filter duplicated categories in parsed categories
    const addCategoriesTitles = parsedCategoriesTitles
      .filter(title => !existentCategoriesTitles.includes(String(title)))
      .filter(
        (categoryTitle, index, categoriesTitles) =>
          categoriesTitles.indexOf(categoryTitle) === index,
      );

    // add new categories on database
    const newCategories = categoriesRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );
    await categoriesRepository.save(newCategories);

    // merge new categories and existent categories
    const categories = [...existentCategories, ...newCategories];

    // add new transactions in database
    const transactions = transactionsRepository.create(
      parsedTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: categories.find(
          ({ title }) => title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(transactions);

    // remove csv file from tmp folder
    await fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
