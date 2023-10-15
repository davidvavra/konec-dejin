export interface SignInResponse {
    invalidPassword: boolean;
    token: string;
}

export interface Round {
    id: string, name: string, tense: string
}

export interface Action {
    description: string,
    df: number;
    visibility: string;
    type: string;
    delegate: string,
    delegation: string,
    keyword: string,
    result: string,
    targetCountry: string,
}

export interface DelegateRound {
    availableMainActions: number,
    delegationId: string
}

export interface RoundInfo {
    name: string,
    flag: string,
    deadline: string,
    smallSize: boolean,
    presentRound: boolean,
    availableDf: number,
    message: string,
    bvs: BvChange[]
}

export interface BvChange {
    bv: number
    description: string
}

export interface Delegate {
    name: string
}

export interface Unit {
    name: string,
    state: string,
    type: string,
    delegate: string,
    visibility: string,
    description: string
}

export interface VotingRight {
    id: string,
    name: string,
    votes: number
  }

export interface VotingRightWithQuestionPath extends VotingRight {
    dbPath: string
}

export interface Question {
    name: string,
    questionType: string,
    byDelegateId: string,
    byVotingRight: string,
    roundId: string,
    hidden: boolean,
}

export interface QuestionWithDbPath extends Question {
    dbPath: string
}
