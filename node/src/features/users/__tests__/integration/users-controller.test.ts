import { randomUUID } from "node:crypto";
import { Collection, FindCursor, UUID } from "mongodb";
import { Request } from "express";
import { expressDoubles } from "../../../../__mocks__";
import { database } from "../../../../database/mongo-database";
import { FindUserDto, User } from "../../types";
import { UsersRepository } from "../../users-repository";
import { UsersService } from "../../users-service";
import { UsersController } from "../../users-controller";
import { StatusCodes } from "http-status-codes";

jest.deepUnmock("../../users-repository");
jest.deepUnmock("../../users-service");
jest.deepUnmock("../../users-controller");
describe("Integration Testing | UsersController", () => {
  const spies = {} as { uuid: jest.MockedObjectDeep<UUID> };
  const mocks = {} as {
    findCursor: jest.MockedObject<FindCursor>;
    usersCollection: jest.MockedObjectDeep<Collection<User>>;
  };
  const sut = {} as {
    usersRepository: UsersRepository;
    usersService: UsersService;
    usersController: UsersController;
  };
  const data = {} as {
    id: string;
    user: User;
    findUserDto: FindUserDto;
  };

  beforeAll(() => {
    spies.uuid = jest.mocked(new UUID());
    mocks.findCursor = jest.mocked(new FindCursor());
    mocks.usersCollection = jest.mocked(database.collection(""));
    mocks.usersCollection.find.mockReturnValue(mocks.findCursor);
    sut.usersRepository = new UsersRepository(mocks.usersCollection);
    sut.usersService = new UsersService(sut.usersRepository);
    sut.usersController = new UsersController(sut.usersService);
    data.id = randomUUID();
    data.user = {
      external_id: spies.uuid,
      created_at: new Date(),
      email: "test@test.com",
      password: "password",
      sessions: [],
      roles: [],
    };
    data.findUserDto = (({
      external_id,
      created_at: createdAt,
      ...rest
    }: User) => ({
      id: data.id,
      createdAt,
      ...rest,
    }))(data.user);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findById", () => {
    const suiteInputs = {} as { request: Request };

    beforeAll(() => {
      suiteInputs.request = {
        params: { id: data.id },
      } as Partial<Request> as Request;
    });

    it("when request contains valid params, should respond with status OK and json of user", async () => {
      async function arrange() {
        mocks.usersCollection.findOne.mockResolvedValueOnce(data.user);
        spies.uuid.toHexString.mockReturnValueOnce(data.id);
      }
      async function act() {
        await sut.usersController.findById(
          suiteInputs.request,
          expressDoubles.response,
          expressDoubles.nextFunction
        );
      }
      async function assert() {
        expect(expressDoubles.response.status).toHaveBeenLastCalledWith(
          StatusCodes.OK
        );
        expect(expressDoubles.response.json).toHaveBeenLastCalledWith(
          data.findUserDto
        );
      }

      await arrange().then(act).then(assert);
    });

    it("when request contains invalid params, should call next with Error", async () => {
      const testInputs = {} as { request: Request };
      async function arrange() {
        testInputs.request = {
          params: {},
        } as Request;
      }
      async function act() {
        await sut.usersController.findById(
          testInputs.request,
          expressDoubles.response,
          expressDoubles.nextFunction
        );
      }
      async function assert() {
        expect(expressDoubles.nextFunction).toHaveBeenLastCalledWith(
          expect.any(Error)
        );
      }

      await arrange().then(act).then(assert);
    });
  });

  describe("findAll", () => {
    const suiteInputs = {} as { request: Request };

    beforeAll(() => {
      suiteInputs.request = {} as Request;
    });

    describe("should respond with status OK and json of users", () => {
      const testData: User = {
        external_id: new UUID(),
        created_at: new Date(),
        email: "test@test.com",
        password: "password",
        sessions: [],
        roles: [],
      };

      it.each`
        findCursorReturn
        ${[]}
        ${[testData]}
        ${[testData, testData]}
      `(
        "of length $findCursorReturn.length",
        async ({ findCursorReturn }: { findCursorReturn: User[] }) => {
          async function arrange() {
            mocks.findCursor.toArray.mockResolvedValueOnce(findCursorReturn);
          }
          async function act() {
            await sut.usersController.findAll(
              suiteInputs.request,
              expressDoubles.response,
              expressDoubles.nextFunction
            );
          }
          async function assert() {
            expect(expressDoubles.response.status).toHaveBeenLastCalledWith(
              StatusCodes.OK
            );
            expect(expressDoubles.response.json).toHaveBeenLastCalledWith(
              expect.objectContaining<Pick<Array<FindUserDto>, "length">>({
                length: findCursorReturn.length,
              })
            );
          }

          await arrange().then(act).then(assert);
        }
      );
    });
  });

  describe("create", () => {
    const suiteInputs = {} as { request: Request };

    beforeAll(() => {
      suiteInputs.request = {
        body: (({ email, password }: User) => ({ email, password }))(data.user),
      } as Partial<Request> as Request;
    });

    it("when request contains valid body, should respond with status CREATED, json of created user and location with it's id", async () => {
      async function arrange() {
        mocks.usersCollection.findOne.mockResolvedValueOnce(data.user);
        spies.uuid.toHexString.mockReturnValueOnce(data.id);
      }
      async function act() {
        await sut.usersController.create(
          suiteInputs.request,
          expressDoubles.response,
          expressDoubles.nextFunction
        );
      }
      async function assert() {
        expect(expressDoubles.response.status).toHaveBeenLastCalledWith(
          StatusCodes.CREATED
        );
        expect(expressDoubles.response.location).toHaveBeenLastCalledWith(
          expect.stringMatching(data.id)
        );
        expect(expressDoubles.response.json).toHaveBeenLastCalledWith(
          data.findUserDto
        );
      }

      await arrange().then(act).then(assert);
    });

    it("when request contains invalid body, should call next with Error", async () => {
      const input = {} as { request: Request };
      async function arrange() {
        input.request = {
          body: {},
        } as Request;
      }
      async function act() {
        await sut.usersController.create(
          input.request,
          expressDoubles.response,
          expressDoubles.nextFunction
        );
      }
      async function assert() {
        expect(expressDoubles.nextFunction).toHaveBeenLastCalledWith(
          expect.any(Error)
        );
      }

      await arrange().then(act).then(assert);
    });
  });
});
