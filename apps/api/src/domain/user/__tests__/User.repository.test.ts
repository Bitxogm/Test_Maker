import { describe, it, expect, vi } from "vitest";
import { IUserRepository } from "../User.repository";
import { User, UserPlan } from "../User.entity";

describe("IUserRepository Interface (Mock)", () => {
  it("should be implementable by a mock", async () => {
    const mockUser = new User({
      id: "u1",
      email: "test@test.com",
      name: "Test",
      passwordHash: "hash",
      plan: UserPlan.FREE,
      createdAt: new Date(),
    });

    const mockRepo: IUserRepository = {
      findById: vi.fn().mockResolvedValue(mockUser),
      findByEmail: vi.fn().mockResolvedValue(mockUser),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const user = await mockRepo.findById("u1");
    expect(user).toBe(mockUser);
    expect(mockRepo.findById).toHaveBeenCalledWith("u1");

    await mockRepo.save(mockUser);
    expect(mockRepo.save).toHaveBeenCalledWith(mockUser);
  });
});
