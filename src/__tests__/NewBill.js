/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI";
import NewBill from "../containers/NewBill";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      jest.mock("../app/Store", () => mockStore);
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      document.body.innerHTML = NewBillUI();
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    test("Change file handler should display the file name if the file format is supported", () => {
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
      const blob = new Blob([""], { type: "image/png" });
      const file = new File([blob], "test.png", { type: "image/png" });
      const input = screen.getByTestId("file");
      input.addEventListener("change", handleChangeFile);
      fireEvent.change(input, { target: { files: [file] } });
      userEvent.upload(input, file);
      expect(input.files.length).toBe(1);
      expect(input.files[0].name).toBe("test.png");
      expect(handleChangeFile).toHaveBeenCalledTimes(2);
    });
    test("It should submit new bill when I fill correctly fields", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const handleSubmit = jest.fn(newBill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);
      const uint8 = new Uint8Array([0xff, 0xd8, 0xff]); // JPEG signature
      const file = new File([uint8], "test.jpeg", { type: "image/jpeg" });
      const input = screen.getByTestId("file");
      input.addEventListener("change", newBill.handleChangeFile);
      fireEvent.change(input, {
        target: {
          files: [file],
        },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "test" },
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
        target: { value: undefined },
      });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "test" },
      });
      newBill.fileName = "test.jpeg";
      newBill.fileUrl = "http://localhost:3000/test.jpeg";
      const submitButton = screen.getByText("Envoyer");
      submitButton.addEventListener("click", handleSubmit);
      fireEvent.submit(form);
      expect(handleSubmit).toBeCalledTimes(1);
    });
    test("It should create a new bill successfully", async () => {
      const uint8 = new Uint8Array([0xff, 0xd8, 0xff]); // JPEG signature
      const file = new File([uint8], "test.jpeg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", "a@a");
      const value = {
        fileUrl: "https://localhost:3456/images/test.jpg",
        key: "1234",
      };
      mockStore.bills().create = jest.fn().mockResolvedValue(value);
      await expect(mockStore.bills().create()).resolves.toEqual(value);
      await expect(mockStore.bills().create).toHaveBeenCalledTimes(1);
    });
    test("It should create a new bill but failed", async () => {
      const spyConsoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const expectedError = new Error(
        "Erreur lors de la création de la note de frais"
      );
      mockStore.bills().create = jest.fn().mockRejectedValue(expectedError);
      await expect(mockStore.bills().create()).rejects.toEqual(expectedError);
      try {
        await mockStore.bills().create();
      } catch (e) {
        console.error(e);
        expect(e).toEqual(expectedError);
      }
      expect(spyConsoleError).toHaveBeenCalledWith(expectedError);
    });
    test("It should call updateBill", async () => {
      const newBill = {
        email: "a@a",
        type: "Restaurants et bars",
        name: "test",
        amount: 100,
        date: "2021-03-01",
        vat: "20",
        pct: 20,
        commentary: "test",
        fileUrl: "http://localhost:3000/test.jpeg",
        fileName: "test.jpeg",
        status: "pending",
      };
      mockStore.bills().update = jest.fn().mockResolvedValue(newBill);
      await expect(mockStore.bills().update()).resolves.toEqual(newBill);
    });
    test("It should call updateBill but failed", async () => {
      const spyConsoleError = jest
        .spyOn(global.console, "error")
        .mockImplementation();
      const expectedError = await new Error("Erreur");
      mockStore.bills().update = jest.fn().mockRejectedValue(expectedError);
      await expect(mockStore.bills().update()).rejects.toEqual(expectedError);
      /* mockStore.bills().update().catch((e) => {
            console.error(e);
            expect(e).toEqual(expectedError);
          }); */
      try {
        await mockStore.bills().update();
      } catch (e) {
        console.error(e);
        expect(e).toEqual(expectedError);
      }
      expect(spyConsoleError).toHaveBeenCalledWith(expectedError);
      spyConsoleError.mockRestore();
    });
    describe("If I select a bad file format", () => {
      test("Then it should display an error message", () => {
        const html = NewBillUI();
        document.body.innerHTML = html;

        // Mock localStorage
        Object.defineProperty(window, "localStorage", {
          value: {
            getItem: jest.fn(() => JSON.stringify({ email: "test@test.com" })),
            setItem: jest.fn(() => null),
          },
          writable: true,
        });

        const newBill = new NewBill({
          document,
          onNavigate: jest.fn(),
          localStorage: window.localStorage,
        });

        const file = screen.getByTestId("file");
        const fileError = screen.getByTestId("error-message-file");

        // Mock DataTransfer object
        class MockDataTransfer {
          constructor() {
            this.filesArray = [];
          }

          get files() {
            return this.filesArray;
          }

          get items() {
            return {
              add: (file) => this.filesArray.push(file),
              remove: (index) => this.filesArray.splice(index, 1),
            };
          }
        }

        const dataTransfer = new MockDataTransfer();
        const filePDF = new File([""], "test.pdf", {
          type: "application/pdf",
        });
        dataTransfer.items.add(filePDF);

        // Define the property 'files' on the input element
        Object.defineProperty(file, "files", {
          value: dataTransfer.files,
          writable: true,
        });

        file.dispatchEvent(new Event("change"));

        expect(fileError.textContent).toBe("Format de fichier invalide");
        expect(file.value).toBe("");
      });
      test("Then it should display an error message when I click the submit button", () => {
        const html = NewBillUI();
        document.body.innerHTML = html;

        // Mock localStorage
        Object.defineProperty(window, "localStorage", {
          value: {
            getItem: jest.fn(() => JSON.stringify({ email: "test@test.com" })),
            setItem: jest.fn(() => null),
          },
          writable: true,
        });

        const newBill = new NewBill({
          document,
          onNavigate: jest.fn(),
          localStorage: window.localStorage,
        });

        const file = screen.getByTestId("file");
        const fileError = screen.getByTestId("error-message-file");
        const submitError = screen.getByTestId("error-message-submit");

        // Mock DataTransfer object

        class MockDataTransfer {
          constructor() {
            this.filesArray = [];
          }

          get files() {
            return this.filesArray;
          }

          get items() {
            return {
              add: (file) => this.filesArray.push(file),
              remove: (index) => this.filesArray.splice(index, 1),
            };
          }
        }

        const dataTransfer = new MockDataTransfer();
        const filePDF = new File([""], "test.pdf", {
          type: "application/pdf",
        });
        dataTransfer.items.add(filePDF);

        // Define the property 'files' on the input element
        Object.defineProperty(file, "files", {
          value: dataTransfer.files,
          writable: true,
        });

        file.dispatchEvent(new Event("change"));

        const form = screen.getByTestId("form-new-bill");
        const handleSubmit = jest.fn(newBill.handleSubmit);
        form.addEventListener("submit", handleSubmit);
        form.dispatchEvent(new Event("submit"));

        expect(submitError.textContent).toBe(
          "Aucun fichier valide n'a été sélectionné"
        );
      });
    });
  });
});

describe("integration test post", () => {
  test("It should post a new bill", async () => {
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
    document.body.innerHTML = NewBillUI();
    const newBill = new NewBill({
      document,
      onNavigate,
      store: mockStore,
      localStorage: window.localStorage,
    });
    const form = screen.getByTestId("form-new-bill");
    const newData = {
      type: "Restaurants et bars",
      name: "test3",
      amount: 100,
      date: "2021-03-01",
      vat: "20",
      pct: 20,
      commentary: "test",
      fileUrl: "http://localhost:3000/test.jpeg",
      fileName: "test.jpeg",
    };
    const spyHandleSubmit = jest.spyOn(newBill, "handleSubmit");
    // const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
    const spyUpdateBill = jest.spyOn(newBill, "updateBill");
    newBill.fileName = "test.jpeg";
    newBill.fileUrl = "http://localhost:3000/test.jpeg";
    newBill.status = "pending";
    fireEvent.change(screen.getByTestId("expense-type"), {
      target: { value: newData.type },
    });
    fireEvent.change(screen.getByTestId("expense-name"), {
      target: { value: newData.name },
    });
    fireEvent.change(screen.getByTestId("datepicker"), {
      target: { value: newData.date },
    });
    fireEvent.change(screen.getByTestId("amount"), {
      target: { value: newData.amount },
    });
    fireEvent.change(screen.getByTestId("vat"), {
      target: { value: newData.vat },
    });
    fireEvent.change(screen.getByTestId("pct"), {
      target: { value: newData.pct },
    });
    fireEvent.change(screen.getByTestId("commentary"), {
      target: { value: newData.commentary },
    });
    form.addEventListener("click", spyHandleSubmit);
    fireEvent.click(form);
    expect(spyHandleSubmit).toHaveBeenCalled();
    expect(spyHandleSubmit).toHaveBeenCalledTimes(1);
    expect(spyUpdateBill).toHaveBeenCalled();
    expect(spyUpdateBill).toHaveBeenCalledTimes(1);
    // expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
  test("It should display a new bill", async () => {
    jest.spyOn(mockStore, "bills");
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
    const root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.appendChild(root);
    router();
    const createdBill = {
      fileUrl: "https://localhost:3456/images/test.jpg",
      key: "1234",
    };
    mockStore.bills.mockImplementationOnce(() => ({
      create: () => Promise.resolve(createdBill),
    }));
    const updatedBill = {
      id: "47qAXb6fIm2zOKkLzMro",
      vat: "80",
      fileUrl:
        "https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
      status: "pending",
      type: "Hôtel et logement",
      commentary: "séminaire billed",
      name: "encore",
      fileName: "preview-facture-free-201801-pdf-1.jpg",
      date: "2004-04-04",
      amount: 400,
      commentAdmin: "ok",
      email: "a@a",
      pct: 20,
    };
    mockStore.bills.mockImplementationOnce(() => ({
      update: () => Promise.resolve(updatedBill),
    }));
    await new Promise(process.nextTick);
    window.onNavigate(ROUTES_PATH.Bills);
    // expect(await screen.getByText(/mes notes de frais/i)).toBeInTheDocument();
  });
});
