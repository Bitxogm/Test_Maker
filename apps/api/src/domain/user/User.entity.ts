export enum UserPlan {
  FREE = "FREE",
  PRO = "PRO",
}

export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: UserPlan;
  createdAt: Date;
}

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly name: string;
  public readonly passwordHash: string;
  public readonly plan: UserPlan;
  public readonly createdAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.plan = props.plan;
    this.createdAt = props.createdAt;
  }
}
