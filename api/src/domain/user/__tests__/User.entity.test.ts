import { User, UserPlan } from "../User.entity";
import { describe, it, expect } from "vitest";

describe("User Entity", () => {
  it("should create a user with all properties", () => {
    const props = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
      plan: UserPlan.FREE,
      createdAt: new Date(),
    };

    const user = new User(props);

    expect(user.id).toBe(props.id);
    expect(user.email).toBe(props.email);
    expect(user.name).toBe(props.name);
    expect(user.passwordHash).toBe(props.passwordHash);
    expect(user.plan).toBe(props.plan);
    expect(user.createdAt).toBe(props.createdAt);
  });

  it("should allow creating a PRO user", () => {
    const props = {
      id: "user-2",
      email: "pro@example.com",
      name: "Pro User",
      passwordHash: "secure_hash",
      plan: UserPlan.PRO,
      createdAt: new Date(),
    };

    const user = new User(props);
    expect(user.plan).toBe(UserPlan.PRO);
  });
});
