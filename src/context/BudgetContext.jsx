import { createContext, useContext, useReducer } from 'react';

const BudgetContext = createContext();

const initialState = {
  // Onboarding
  totalBudget: 0,
  guestCount: 200,
  onboardingComplete: false,
  // Selections
  selectedHall: null,
  selectedStudio: null,
  selectedDress: null,
  selectedMakeup: null,
  selectedSnap: null,
  selectedRing: null,
  selectedBouquet: null,
  selectedHanbok: null,
  // Toggles
  includeStudio: true,
  includeDress: true,
  includeMakeup: true,
  includeSnap: true,
  includeRing: true,
  includeBouquet: true,
  includeHanbok: true,
};

function budgetReducer(state, action) {
  switch (action.type) {
    case 'SET_BUDGET':
      return { ...state, totalBudget: action.payload };
    case 'SET_GUEST_COUNT':
      return { ...state, guestCount: action.payload };
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true, totalBudget: action.payload.budget, guestCount: action.payload.guestCount };
    case 'SELECT_HALL':
      return { ...state, selectedHall: action.payload };
    case 'DESELECT_HALL':
      return { ...state, selectedHall: null };
    case 'SELECT_STUDIO':
      return { ...state, selectedStudio: action.payload };
    case 'DESELECT_STUDIO':
      return { ...state, selectedStudio: null };
    case 'SELECT_DRESS':
      return { ...state, selectedDress: action.payload };
    case 'DESELECT_DRESS':
      return { ...state, selectedDress: null };
    case 'SELECT_MAKEUP':
      return { ...state, selectedMakeup: action.payload };
    case 'DESELECT_MAKEUP':
      return { ...state, selectedMakeup: null };
    case 'TOGGLE_STUDIO':
      return { ...state, includeStudio: action.payload, selectedStudio: action.payload ? state.selectedStudio : null };
    case 'TOGGLE_DRESS':
      return { ...state, includeDress: action.payload, selectedDress: action.payload ? state.selectedDress : null };
    case 'SELECT_SNAP':
      return { ...state, selectedSnap: action.payload };
    case 'DESELECT_SNAP':
      return { ...state, selectedSnap: null };
    case 'TOGGLE_SNAP':
      return { ...state, includeSnap: action.payload, selectedSnap: action.payload ? state.selectedSnap : null };
    case 'SELECT_RING':
      return { ...state, selectedRing: action.payload };
    case 'DESELECT_RING':
      return { ...state, selectedRing: null };
    case 'TOGGLE_RING':
      return { ...state, includeRing: action.payload, selectedRing: action.payload ? state.selectedRing : null };
    case 'SELECT_BOUQUET':
      return { ...state, selectedBouquet: action.payload };
    case 'DESELECT_BOUQUET':
      return { ...state, selectedBouquet: null };
    case 'TOGGLE_BOUQUET':
      return { ...state, includeBouquet: action.payload, selectedBouquet: action.payload ? state.selectedBouquet : null };
    case 'SELECT_HANBOK':
      return { ...state, selectedHanbok: action.payload };
    case 'DESELECT_HANBOK':
      return { ...state, selectedHanbok: null };
    case 'TOGGLE_HANBOK':
      return { ...state, includeHanbok: action.payload, selectedHanbok: action.payload ? state.selectedHanbok : null };
    case 'TOGGLE_MAKEUP':
      return { ...state, includeMakeup: action.payload, selectedMakeup: action.payload ? state.selectedMakeup : null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);

  const getHallCost = () => {
    if (!state.selectedHall) return 0;
    return state.selectedHall.pricePerPerson * state.guestCount;
  };

  const getStudioCost = () => state.includeStudio && state.selectedStudio ? state.selectedStudio.price : 0;
  const getDressCost = () => state.includeDress && state.selectedDress ? state.selectedDress.price : 0;
  const getMakeupCost = () => state.includeMakeup && state.selectedMakeup ? state.selectedMakeup.price : 0;
  const getSnapCost = () => state.includeSnap && state.selectedSnap ? state.selectedSnap.price : 0;
  const getRingCost = () => state.includeRing && state.selectedRing ? state.selectedRing.price : 0;
  const getBouquetCost = () => state.includeBouquet && state.selectedBouquet ? state.selectedBouquet.price : 0;
  const getHanbokCost = () => state.includeHanbok && state.selectedHanbok ? state.selectedHanbok.price : 0;

  const getTotalCost = () => getHallCost() + getStudioCost() + getDressCost() + getMakeupCost() + getSnapCost() + getRingCost() + getBouquetCost() + getHanbokCost();
  const getRemainingBudget = () => state.totalBudget - getTotalCost();
  const getBudgetPercent = () => state.totalBudget > 0 ? Math.min((getTotalCost() / state.totalBudget) * 100, 100) : 0;
  const isOverBudget = () => getTotalCost() > state.totalBudget;

  const value = {
    ...state,
    dispatch,
    getHallCost,
    getStudioCost,
    getDressCost,
    getMakeupCost,
    getSnapCost,
    getRingCost,
    getBouquetCost,
    getHanbokCost,
    getTotalCost,
    getRemainingBudget,
    getBudgetPercent,
    isOverBudget,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error('useBudget must be used within BudgetProvider');
  return context;
}
