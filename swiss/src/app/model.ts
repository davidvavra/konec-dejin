export interface SignInResponse {
    invalidPassword: boolean;
    token: string;
}

export interface VotingRight {
    controlledBy: string,
    name: string,
    votes: number,
    extraMission: string,
    extraUnit: string
  }