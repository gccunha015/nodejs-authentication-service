import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { UuidSchema } from "../../../utils";
import { UsersController } from "../controller";
import { User } from "../model";
import { UsersService } from "../service";
import { CreateUserDto, CreateUserDtoSchema, FindUserDtoSchema } from "../dtos";

jest.unmock("bcrypt");
jest.unmock("zod");
jest.unmock("../model");

jest.unmock("../controller");
describe("UsersController", () => {
  const stubs = {} as { id: string; user: User };
  const mocks = {} as {
    uuidSchema: jest.MockedObjectDeep<typeof UuidSchema>;
    findUserDtoSchema: jest.MockedObjectDeep<typeof FindUserDtoSchema>;
    usersService: jest.MockedObjectDeep<UsersService>;
    response: jest.MockedObjectDeep<Response>;
    nextFunction: jest.MockedFunction<NextFunction>;
  };
  const sut = {} as { controller: UsersController };

  beforeAll(() => {
    stubs.id = randomUUID();
    stubs.user = {
      externalId: stubs.id,
      email: "test@test.com",
      password: "password",
      createdAt: new Date(),
    };
    mocks.uuidSchema = jest.mocked(UuidSchema);
    mocks.findUserDtoSchema = jest.mocked(FindUserDtoSchema);
    mocks.findUserDtoSchema.parseAsync.mockImplementation(async (data) => {
      const { externalId: id, ...rest } = data as User;
      return { ...rest, id };
    });
    mocks.usersService = jest.mocked(new UsersService());
    mocks.response = {
      status: jest.fn().mockReturnThis(),
      location: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as Partial<Response> as jest.MockedObjectDeep<Response>;
    mocks.nextFunction = jest.fn();
    sut.controller = new UsersController(mocks.usersService);
  });

  beforeEach(() => {
    mocks.findUserDtoSchema.parseAsync.mockClear();
  });

  describe("findById", () => {
    it("should respond with status OK and json of user for valid id", async () => {
      const testStubs = {} as { request: Request };
      async function arrange() {
        testStubs.request = {
          params: { id: stubs.id },
        } as Partial<Request> as Request;
        mocks.uuidSchema.parseAsync.mockResolvedValueOnce(stubs.id);
        mocks.usersService.findById.mockResolvedValueOnce(stubs.user);
      }
      async function act() {
        await sut.controller.findById(
          testStubs.request,
          mocks.response,
          mocks.nextFunction
        );
      }
      async function assert() {
        expect(mocks.response.status).toHaveBeenLastCalledWith(StatusCodes.OK);
        expect(mocks.response.json).toHaveBeenLastCalledWith(
          await mocks.findUserDtoSchema.parseAsync.mock.results[0].value
        );
      }

      await arrange().then(act).then(assert);
    });

    it("should call next with error for invalid id", async () => {
      const testStubs = {} as { id: string; request: Request; error: Error };
      async function arrange() {
        testStubs.id = "0";
        testStubs.request = {
          params: { id: testStubs.id },
        } as Partial<Request> as Request;
        testStubs.error = new Error();
        mocks.uuidSchema.parseAsync.mockRejectedValueOnce(testStubs.error);
      }
      async function act() {
        await sut.controller.findById(
          testStubs.request,
          mocks.response,
          mocks.nextFunction
        );
      }
      function assert() {
        expect(mocks.nextFunction).toHaveBeenLastCalledWith(testStubs.error);
      }

      await arrange().then(act).then(assert);
    });
  });

  describe("findAll", () => {
    const suitSpies = {} as { Promise: { all: jest.SpyInstance } };

    beforeAll(() => {
      suitSpies.Promise = { all: jest.spyOn(Promise, "all") };
    });

    beforeEach(() => {
      suitSpies.Promise.all.mockClear();
    });

    it("should respond with status OK and json of users", async () => {
      const testStubs = {} as { request: Request; users: User[] };
      async function arrange() {
        testStubs.request = {} as Request;
        testStubs.users = [
          stubs.user,
          { ...stubs.user, externalId: randomUUID() },
        ];
        mocks.usersService.findAll.mockResolvedValueOnce(testStubs.users);
      }
      async function act() {
        await sut.controller.findAll(
          testStubs.request,
          mocks.response,
          mocks.nextFunction
        );
      }
      async function assert() {
        expect(mocks.response.status).toHaveBeenLastCalledWith(StatusCodes.OK);
        expect(mocks.response.json).toHaveBeenLastCalledWith(
          await suitSpies.Promise.all.mock.results[0].value
        );
      }

      await arrange().then(act).then(assert);
    });

    it("should respond with status OK and json of an empty array", async () => {
      const testStubs = {} as { request: Request };
      async function arrange() {
        testStubs.request = {} as Request;
        mocks.usersService.findAll.mockResolvedValueOnce([]);
      }
      async function act() {
        await sut.controller.findAll(
          testStubs.request,
          mocks.response,
          mocks.nextFunction
        );
      }
      async function assert() {
        expect(mocks.response.status).toHaveBeenLastCalledWith(StatusCodes.OK);
        expect(mocks.response.json).toHaveBeenLastCalledWith(
          await suitSpies.Promise.all.mock.results[0].value
        );
      }

      await arrange().then(act).then(assert);
    });
  });

  describe("create", () => {
    const suiteMocks = {} as {
      creatUserDtoSchema: jest.MockedObjectDeep<typeof CreateUserDtoSchema>;
    };
    const suiteStubs = {} as { createUserDto: CreateUserDto };

    beforeAll(() => {
      suiteMocks.creatUserDtoSchema = jest.mocked(CreateUserDtoSchema);
      suiteStubs.createUserDto = {
        email: stubs.user.email,
        password: stubs.user.password,
      };
    });

    it("should respond with status CREATED, location containing user id and json of user", async () => {
      const testStubs = {} as { request: Request };
      async function arrange() {
        testStubs.request = {
          body: suiteStubs.createUserDto,
        } as Partial<Request> as Request;
        suiteMocks.creatUserDtoSchema.parseAsync.mockResolvedValueOnce(
          suiteStubs.createUserDto
        );
        mocks.usersService.create.mockResolvedValueOnce(stubs.user);
      }
      async function act() {
        return await sut.controller.create(
          testStubs.request,
          mocks.response,
          mocks.nextFunction
        );
      }
      async function assert() {
        expect(mocks.response.status).toHaveBeenLastCalledWith(
          StatusCodes.CREATED
        );
        expect(mocks.response.location.mock.lastCall?.[0]).toMatch(
          new RegExp(`${stubs.user.externalId}`)
        );
        expect(mocks.response.json).toHaveBeenLastCalledWith(
          await mocks.findUserDtoSchema.parseAsync.mock.results[0].value
        );
      }

      await arrange().then(act).then(assert);
    });

    // it("should throw error for invalid email", async () => {
    //   const testStubs = {} as { createUserDto: CreateUserDto };
    //   async function arrange() {
    //     testStubs.createUserDto = {
    //       ...suiteStubs.createUserDto,
    //       email: "test",
    //     };
    //     suiteMocks.userSchema.parseAsync.mockRejectedValueOnce(new Error());
    //   }
    //   async function act() {
    //     try {
    //       return await sut.service.create(testStubs.createUserDto);
    //     } catch (error) {
    //       return error;
    //     }
    //   }
    //   function assert(actResult: unknown) {
    //     expect(actResult).toBeInstanceOf(Error);
    //   }

    //   await arrange().then(act).then(assert);
    // });

    // it("should throw error for invalid password", async () => {
    //   const testStubs = {} as { createUserDto: CreateUserDto };
    //   async function arrange() {
    //     testStubs.createUserDto = {
    //       ...suiteStubs.createUserDto,
    //       password: "pass",
    //     };
    //     suiteMocks.userSchema.parseAsync.mockRejectedValueOnce(new Error());
    //   }
    //   async function act() {
    //     try {
    //       return await sut.service.create(testStubs.createUserDto);
    //     } catch (error) {
    //       return error;
    //     }
    //   }
    //   function assert(actResult: unknown) {
    //     expect(actResult).toBeInstanceOf(Error);
    //   }

    //   await arrange().then(act).then(assert);
    // });
  });
});
