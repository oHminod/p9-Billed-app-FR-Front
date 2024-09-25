/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

jest.mock("../app/store", () => mockStore);

describe("Given that I am logged in as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "a@a" })
    );
    document.body.innerHTML = "";
  });

  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      document.body.innerHTML = NewBillUI();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe("When I select a valid file", () => {
      test("Then the file name should be displayed", async () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleChangeFile = jest.fn(newBill.handleChangeFile);
        const inputFile = screen.getByTestId("file");
        inputFile.addEventListener("change", handleChangeFile);

        const file = new File(["image"], "test.jpg", { type: "image/jpeg" });
        Object.defineProperty(inputFile, "files", {
          value: [file],
        });

        fireEvent.change(inputFile);

        await waitFor(() => expect(handleChangeFile).toHaveBeenCalled());

        await waitFor(() => expect(newBill.fileName).toBe("test.jpg"));

        expect(inputFile.files[0]).toStrictEqual(file);
        expect(inputFile.files[0].name).toBe("test.jpg");
        const errorFileMsg = screen.getByTestId("error-message-file");
        expect(errorFileMsg.textContent).toBe("");
      });
    });

    describe("When I select a file with an invalid format", () => {
      test("Then an error message should be displayed", async () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleChangeFile = jest.fn(newBill.handleChangeFile);
        const inputFile = screen.getByTestId("file");
        inputFile.addEventListener("change", handleChangeFile);

        const file = new File(["document"], "test.pdf", {
          type: "application/pdf",
        });
        Object.defineProperty(inputFile, "files", {
          value: [file],
        });

        fireEvent.change(inputFile);

        await waitFor(() => expect(handleChangeFile).toHaveBeenCalled());

        const errorFileMsg = screen.getByTestId("error-message-file");
        expect(errorFileMsg.textContent).toBe("Format de fichier invalide");
        expect(inputFile.value).toBe("");
      });
    });

    describe("When I submit the form with valid data", () => {
      test("Then the bill should be created and I should be redirected to the bills page (POST)", async () => {
        const onNavigate = jest.fn();
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleSubmit = jest.fn(newBill.handleSubmit);
        const form = screen.getByTestId("form-new-bill");
        form.addEventListener("submit", handleSubmit);

        fireEvent.change(screen.getByTestId("expense-type"), {
          target: { value: "Transports" },
        });
        fireEvent.change(screen.getByTestId("expense-name"), {
          target: { value: "Vol Paris Londres" },
        });
        fireEvent.change(screen.getByTestId("datepicker"), {
          target: { value: "2021-03-01" },
        });
        fireEvent.change(screen.getByTestId("amount"), {
          target: { value: "100" },
        });
        fireEvent.change(screen.getByTestId("vat"), {
          target: { value: "20" },
        });
        fireEvent.change(screen.getByTestId("pct"), {
          target: { value: "20" },
        });
        fireEvent.change(screen.getByTestId("commentary"), {
          target: { value: "Test expense" },
        });

        const file = new File(["image"], "test.jpg", { type: "image/jpeg" });
        const fileInput = screen.getByTestId("file");
        Object.defineProperty(fileInput, "files", { value: [file] });
        fireEvent.change(fileInput);

        await waitFor(() => expect(newBill.fileName).toBe("test.jpg"));

        fireEvent.submit(form);

        await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
        await waitFor(() =>
          expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"])
        );
      });
    });

    describe("When I submit the form without a valid file (POST)", () => {
      test("Then an error message should be displayed", async () => {
        const onNavigate = jest.fn();
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleSubmit = jest.fn(newBill.handleSubmit);
        const form = screen.getByTestId("form-new-bill");
        form.addEventListener("submit", handleSubmit);

        fireEvent.submit(form);

        await waitFor(() => expect(handleSubmit).toHaveBeenCalled());

        const errorSubmitMsg = screen.getByTestId("error-message-submit");
        expect(errorSubmitMsg.textContent).toBe(
          "Aucun fichier valide n'a été sélectionné"
        );
      });
    });
  });
});
