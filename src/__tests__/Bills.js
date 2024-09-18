/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import * as formatModule from "../app/format.js";

jest.mock("../app/Store.js", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    beforeEach(() => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
    });

    afterEach(() => {
      document.body.innerHTML = "";
    });
    test("fetches bills from mock API GET", async () => {
      const tableBody = screen.getByTestId("tbody");
      expect(tableBody).toBeTruthy();
      expect(tableBody.childElementCount).toBe(4);
    });
    test("Then bill icon in vertical layout should be highlighted", async () => {
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon).toHaveClass("active-icon");
    });
    test("Then bills should be ordered from earliest to latest", () => {
      bills.forEach((bill) => {
        bill.rawDate = bill.date;
      });
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("When I click on btn-new-bill, it should call handleClickNewBill", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = jest.fn();
      const billsContainer = new Bills({
        document,
        onNavigate,
        localStorage: window.localStorage,
      });
      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill);
      const newBillBtn = screen.getByTestId("btn-new-bill");
      newBillBtn.addEventListener("click", handleClickNewBill);
      newBillBtn.click();
      expect(handleClickNewBill).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });
    test("It should open modal on click on eye icon", () => {
      const bill = new Bills({
        document,
        onNavigate: (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        },
        store: mockStore,
        localStorage: window.localStorage,
      });
      const iconEyes = screen.getAllByTestId("icon-eye");
      const handleClickIconEye = jest.fn(bill.handleClickIconEye);
      $.fn.modal = jest.fn();
      for (let i = 0; i < iconEyes.length; i++) {
        const iconEye = iconEyes[i];
        handleClickIconEye(iconEye);
        fireEvent.click(iconEye);
      }
      expect(handleClickIconEye).toHaveBeenCalledTimes(iconEyes.length);
      expect($.fn.modal).toHaveBeenCalled();
    });
  });

  describe("When the promise doesn't resolve", () => {
    let originalBills;

    beforeEach(() => {
      originalBills = mockStore.bills;
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      router();
    });

    afterEach(() => {
      mockStore.bills = originalBills;
    });

    test("Should display error 500", async () => {
      mockStore.bills = jest.fn(() => ({
        list: () => Promise.reject(new Error("Erreur 500")),
      }));

      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("error-message"));
      const errorContainer = screen.getByTestId("error-message");

      expect(errorContainer).toHaveTextContent("Erreur 500");
    });

    test("Should display error 404", async () => {
      mockStore.bills = jest.fn(() => ({
        list: () => Promise.reject(new Error("Erreur 404")),
      }));

      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("error-message"));
      const errorContainer = screen.getByTestId("error-message");

      expect(errorContainer).toHaveTextContent("Erreur 404");
    });
  });

  describe("When corrupted data is introduced", () => {
    let consoleLogSpy;
    let formatDateSpy;
    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, "log");
      consoleLogSpy.mockImplementation(() => {});
      formatDateSpy = jest.spyOn(formatModule, "formatDate");
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      formatDateSpy.mockRestore();
    });
    test("Then an error should be displayed in the log", async () => {
      formatDateSpy.mockImplementation(() => {
        throw new Error("formatDate error");
      });

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      await window.onNavigate(ROUTES_PATH.Bills);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        new Error("formatDate error"),
        "for",
        expect.any(Object)
      );
    });
  });
});
