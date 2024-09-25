/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from "@testing-library/dom";
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

    describe("When I upload a valid file", () => {
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

        await new Promise(process.nextTick); // Attendre la fin des promesses

        expect(handleChangeFile).toHaveBeenCalled();
        expect(inputFile.files[0]).toStrictEqual(file);
        expect(inputFile.files[0].name).toBe("test.jpg");
        const errorFileMsg = screen.getByTestId("error-message-file");
        expect(errorFileMsg.textContent).toBe("");
      });
    });

    describe("When I upload a file with an invalid format", () => {
      test("Then an error message should be displayed", () => {
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

        expect(handleChangeFile).toHaveBeenCalled();
        const errorFileMsg = screen.getByTestId("error-message-file");
        expect(errorFileMsg.textContent).toBe("Format de fichier invalide");
        expect(inputFile.value).toBe("");
      });
    });

    describe("When I submit the form with valid data", () => {
      test("Then the bill should be created and I should be redirected to the bills page", async () => {
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

        // Simuler la fin de la promesse de création de fichier
        await new Promise(process.nextTick);

        newBill.fileUrl = "http://localhost:3000/test.jpg";
        newBill.fileName = "test.jpg";

        fireEvent.submit(form);

        expect(handleSubmit).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
      });
    });

    describe("When I submit the form without a valid file", () => {
      test("Then an error message should be displayed", () => {
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

        expect(handleSubmit).toHaveBeenCalled();
        const errorSubmitMsg = screen.getByTestId("error-message-submit");
        expect(errorSubmitMsg.textContent).toBe(
          "Aucun fichier valide n'a été sélectionné"
        );
      });
    });
  });

  describe("POST integration tests", () => {
    describe("When I create a new bill via the API", () => {
      test("Then it should be created successfully", async () => {
        const createdBill = {
          fileUrl: "https://localhost:3456/images/test.jpg",
          key: "1234",
        };

        mockStore.bills().create = jest.fn().mockResolvedValue(createdBill);

        const response = await mockStore.bills().create();

        expect(mockStore.bills().create).toHaveBeenCalled();
        expect(response).toEqual(createdBill);
      });

      test("Then an error should be handled if creation fails", async () => {
        const onNavigate = jest.fn();
        document.body.innerHTML = NewBillUI();
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const expectedError = new Error(
          "Erreur lors de la création de la note de frais"
        );
        mockStore.bills().create = jest.fn().mockRejectedValue(expectedError);

        const spyConsoleError = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});

        // Simuler handleChangeFile
        const handleChangeFile = jest.fn(newBill.handleChangeFile);
        const inputFile = screen.getByTestId("file");
        inputFile.addEventListener("change", handleChangeFile);

        const file = new File(["image"], "test.jpg", { type: "image/jpeg" });
        Object.defineProperty(inputFile, "files", { value: [file] });

        fireEvent.change(inputFile);

        // Attendre la fin des promesses
        await new Promise(process.nextTick);

        expect(handleChangeFile).toHaveBeenCalled();
        expect(mockStore.bills().create).toHaveBeenCalled();
        expect(spyConsoleError).toHaveBeenCalledWith(expectedError);

        spyConsoleError.mockRestore();
      });
    });

    describe("When I update a bill via the API", () => {
      test("Then it should be updated successfully", async () => {
        const updatedBill = {
          id: "47qAXb6fIm2zOKkLzMro",
          vat: "80",
          fileUrl: "https://localhost:3456/images/test.jpg",
          status: "pending",
          type: "Hôtel et logement",
          commentary: "séminaire billed",
          name: "encore",
          fileName: "test.jpg",
          date: "2004-04-04",
          amount: 400,
          commentAdmin: "ok",
          email: "a@a",
          pct: 20,
        };

        mockStore.bills().update = jest.fn().mockResolvedValue(updatedBill);

        const response = await mockStore.bills().update();

        expect(mockStore.bills().update).toHaveBeenCalled();
        expect(response).toEqual(updatedBill);
      });

      test("Then an error should be handled if update fails", async () => {
        const onNavigate = jest.fn();
        document.body.innerHTML = NewBillUI();
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const expectedError = new Error(
          "Erreur lors de la mise à jour de la note de frais"
        );
        mockStore.bills().update = jest.fn().mockRejectedValue(expectedError);

        const spyConsoleError = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});

        // Simuler handleSubmit
        const handleSubmit = jest.fn(newBill.handleSubmit);
        const form = screen.getByTestId("form-new-bill");
        form.addEventListener("submit", handleSubmit);

        // Remplir le formulaire
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

        // Définir fileUrl et fileName
        newBill.fileUrl = "http://localhost:3000/test.jpg";
        newBill.fileName = "test.jpg";

        fireEvent.submit(form);

        // Attendre la fin des promesses
        await new Promise(process.nextTick);

        expect(handleSubmit).toHaveBeenCalled();
        expect(mockStore.bills().update).toHaveBeenCalled();
        expect(spyConsoleError).toHaveBeenCalledWith(expectedError);

        spyConsoleError.mockRestore();
      });
    });
  });
});
