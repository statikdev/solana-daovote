export type VoteOption = {
  label: string;
  value: number;
  onchainValue: number;
};

export type VoteOptionWithResult = {
  label: string;
  value: number;
  onchainValue: number;
  count: number;
};

export type ProposalInfo = {
  proposalId: number;
  prompt: string;
  description: string;
  proposedBy: string;
  proposedByNftMintAddress: string;
  documentProposalUri: string;
  totalVotesAvailable: number;
  voteOptions: Array<VoteOption>;
  proposalDate: string;
  proposalEndDate: string;
};

export type Proposal = {
  id: number;
  info: ProposalInfo;
  url: string;
};

export type NFTWithMetadata = {
  imageUrl: string;
  mintAddress: string;
  name: string;
};
