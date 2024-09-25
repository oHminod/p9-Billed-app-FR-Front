/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import * as formatModule from "../app/format.js";

jest.mock("../app/Store.js", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on the Bills Page", () => {
    beforeEach(() => {
      // Set up the local storage with employee user
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      // Set up the DOM
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
    });

    afterEach(() => {
      // Clean up the DOM
      document.body.innerHTML = "";
    });

    test("Then it should fetch bills from mock API GET", async () => {
      const tableBody = await waitFor(() => screen.getByTestId("tbody"));
      expect(tableBody).toBeTruthy();
      expect(tableBody.childElementCount).toBe(4); // Assuming there are 4 bills in the mock data
    });

    test("Then the bill icon in the vertical layout should be highlighted", () => {
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then the bills should be ordered from earliest to latest", () => {
      // Prepare the bills with rawDate for sorting
      bills.forEach((bill) => {
        bill.rawDate = bill.date;
      });
      document.body.innerHTML = BillsUI({ data: bills });

      const dateElements = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);

      const sortedDates = [...dateElements].sort((a, b) => (a < b ? 1 : -1));
      expect(dateElements).toEqual(sortedDates);
    });

    test("When I click on the 'New Bill' button, it should navigate to the New Bill page", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = jest.fn();
      const billsContainer = new Bills({
        document,
        onNavigate,
        localStorage: window.localStorage,
      });
      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill);
      const newBillButton = screen.getByTestId("btn-new-bill");
      newBillButton.addEventListener("click", handleClickNewBill);
      fireEvent.click(newBillButton);

      expect(handleClickNewBill).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });

    test("When I click on the eye icon, it should open the bill modal", () => {
      const billsContainer = new Bills({
        document,
        onNavigate: (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        },
        store: mockStore,
        localStorage: window.localStorage,
      });

      const iconEyes = screen.getAllByTestId("icon-eye");
      $.fn.modal = jest.fn(); // Mock the jQuery modal function

      iconEyes.forEach((iconEye) => {
        const handleClickIconEye = jest.fn(() =>
          billsContainer.handleClickIconEye(iconEye)
        );
        iconEye.addEventListener("click", handleClickIconEye);
        fireEvent.click(iconEye);
        expect(handleClickIconEye).toHaveBeenCalled();
      });

      expect($.fn.modal).toHaveBeenCalled();
    });
  });

  describe("When an error occurs on API", () => {
    let originalBills;

    beforeEach(() => {
      originalBills = mockStore.bills;
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      router();
    });

    afterEach(() => {
      mockStore.bills = originalBills;
      document.body.innerHTML = "";
    });

    test("Then it should display a 500 error message", async () => {
      mockStore.bills = jest.fn(() => ({
        list: () => Promise.reject(new Error("Erreur 500")),
      }));

      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("error-message"));
      const errorMessage = screen.getByTestId("error-message");

      expect(errorMessage).toHaveTextContent(/Erreur 500/);
    });

    test("Then it should display a 404 error message", async () => {
      mockStore.bills = jest.fn(() => ({
        list: () => Promise.reject(new Error("Erreur 404")),
      }));

      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("error-message"));
      const errorMessage = screen.getByTestId("error-message");

      expect(errorMessage).toHaveTextContent(/Erreur 404/);
    });
  });

  describe("When corrupted data is introduced", () => {
    let consoleLogSpy;
    let formatDateSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      formatDateSpy = jest.spyOn(formatModule, "formatDate");
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      formatDateSpy.mockRestore();
    });

    test("Then it should log an error and display unformatted dates", async () => {
      formatDateSpy.mockImplementation(() => {
        throw new Error("formatDate error");
      });

      // Set up the local storage with employee user
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      router();
      await window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getAllByTestId("date"));

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        new Error("formatDate error"),
        "for",
        expect.any(Object)
      );

      const dateElements = screen
        .getAllByTestId("date")
        .map((a) => a.innerHTML);

      dateElements.forEach((date) => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Unformatted date pattern
      });
    });
  });
});
