import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slice/authSlice";
import billReducer from "../slice/billSlice";
import savedBillsReducer from "../slice/savedBillsSlice";
import customersReducer from "../slice/customersSlice"; // ensure exact filename

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bill: billReducer,
    savedBills: savedBillsReducer,
    customers: customersReducer
  }
});