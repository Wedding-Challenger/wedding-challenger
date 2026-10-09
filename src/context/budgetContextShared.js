import { createContext, useContext } from 'react';

export const BudgetContext = createContext();

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error('useBudget must be used within BudgetProvider');
  return context;
}
