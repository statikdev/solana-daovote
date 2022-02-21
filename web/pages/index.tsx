import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import BN from 'bn.js';
import { useEffect, useState } from 'react';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

import { VOTE_PROGRAM_ADDRESS } from '../constants/addresses';

import { getNFTsForWallet, getNFTDataForMint } from '../services/NFT';

const VoteProgramAddressPubKey = new PublicKey(VOTE_PROGRAM_ADDRESS);

const NFT_CREATOR_ADDRESS = '7V5HgodrUb1jebRpFDsxTnYMKvEbMvbpTLn9kCinHPdd';

type VoteOption = {
  label: string;
  value: number;
  onchainValue: number;
};

type VoteOptionWithResult = {
  label: string;
  value: number;
  onchainValue: number;
  count: number;
};

type ProposalInfo = {
  proposalId: number;
  prompt: string;
  description: string;
  proposedBy: string;
  proposedByNftMintAddress: string;
  documentProposalUri: string;
  totalVotesAvailable: number;
  voteOptions: Array<VoteOption>;
  proposalDate: string;
};

type Proposal = {
  id: number;
  info: ProposalInfo;
  url: string;
};

const Home: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [availbleNFTs, setAvailableNFTs] = useState<any>([]);
  const [proposals, setProposals] = useState<any>([]);
  const [votes, setVotes] = useState<any>([]);
  const [nftImagesToShow, setNFTImagesToShow] = useState<any>([]);

  useEffect(() => {
    async function retrieve() {
      const proposalAccounts = await connection.getProgramAccounts(
        VoteProgramAddressPubKey,
        {
          filters: [{ dataSize: 148 }],
        }
      );

      const proposalsRetrieval = proposalAccounts.map(
        async (programAccount) => {
          const urlBytes = programAccount.account.data!.slice(0, 100);
          const url = String.fromCharCode(
            ...Array.from(urlBytes).filter((e) => e > 0)
          );

          const proposalId = new BN(
            programAccount.account.data.slice(100, 108),
            10,
            'le'
          ).toString();

          let proposalInfo: ProposalInfo | null = null;
          try {
            const proposalInfoRequest = await fetch(url + '?type=json');
            proposalInfo = JSON.parse(await proposalInfoRequest.text());
          } catch (e) {}

          return {
            url,
            id: proposalId,
            info: proposalInfo,
          };
        }
      );

      const proposals = (await Promise.all(proposalsRetrieval)).filter(
        (proposal) => !!proposal.info
      );

      const voteAccounts = await connection.getProgramAccounts(
        VoteProgramAddressPubKey,
        {
          filters: [
            { memcmp: { bytes: NFT_CREATOR_ADDRESS, offset: 32 } },
            { dataSize: 116 },
          ],
        }
      );

      const votes = voteAccounts.map((e) => {
        const mint = new PublicKey(e.account.data.slice(0, 32)).toString(),
          creator = new PublicKey(e.account.data.slice(32, 64)).toString(),
          voter = new PublicKey(e.account.data.slice(64, 96)).toString(),
          vote = new BN(e.account.data.slice(96, 104), 10, 'le').toString(),
          time = new Date(
            new BN(
              e.account.data[104] +
                (e.account.data[105] << 8) +
                (e.account.data[106] << 16) +
                (e.account.data[107] << 24)
            ).toNumber() * 1000
          ),
          vote_option = new BN(e.account.data.slice(108), 10, 'le').toString();
        return { voter, creator, mint, vote, vote_option, time };
      });

      if (publicKey) {
        const nfts = await getNFTsForWallet(
          connection,
          new PublicKey(publicKey),
          NFT_CREATOR_ADDRESS
        );
        setAvailableNFTs(nfts);
      }

      setProposals(proposals);
      setVotes(votes);
    }
    retrieve();
  }, [connection, publicKey]);

  useEffect(() => {
    async function retrieve() {
      const nftData = await Promise.all(
        votes.map(async (vote: any) => {
          const data = await getNFTDataForMint(connection, vote.mint);
          return { mint: vote.mint, data };
        })
      );

      setNFTImagesToShow(nftData);
    }
    retrieve();
  }, [connection, votes]);

  const votesById = votes.reduce((acc: any, vote: any) => {
    if (!acc[vote.vote]) {
      acc[vote.vote] = [];
    }

    acc[vote.vote].push(vote);
    return acc;
  }, {});

  function renderVotesForProposal(proposal: Proposal, votes: any) {
    console.log('propose', proposal.id, votes);

    const totalVotes = votes.filter(
      (vote: any) => vote.vote === proposal.id
    ).length;
    const voteResultsCount = proposal.info.voteOptions.map(
      (voteOption: VoteOption) => {
        const voteOptionWithResults: VoteOptionWithResult = {
          ...voteOption,
          count: votes.filter((vote: any) => {
            return (
              proposal.id === vote.vote &&
              Number(vote.vote_option) === voteOption.value
            );
          }).length,
        };

        return voteOptionWithResults;
      },
      {}
    );

    const proposalId = proposal.id;

    return (
      <div className="col-12">
        <div className="card mb-4 rounded-3 shadow-sm">
          <div className="card-header py-3 text-white bg-dark">
            <h4 className="my-0 fw-normal">
              {' '}
              <h3>
                {proposal.info.prompt} #{proposalId}
              </h3>
            </h4>
            <div>{proposal.url}</div>
          </div>
          <div className="card-body">
            <h1 className="card-title">
              {totalVotes}
              <small className="text-muted fw-light"> votes</small>
            </h1>
            <ul className="list-unstyled mt-3 mb-4">
              {voteResultsCount.map(
                (voteOptionWithResult: VoteOptionWithResult) => {
                  return (
                    <li key={voteOptionWithResult.value}>
                      <b>Option: {voteOptionWithResult.label}</b> - Total:{' '}
                      {voteOptionWithResult.count}
                    </li>
                  );
                }
              )}
            </ul>
            <button
              type="button"
              className="w-100 btn btn-lg btn-outline-primary"
            >
              <Link href={`/proposal/${proposalId}`} passHref>
                Vote Now
              </Link>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nftsForCreatorInWallet =
    (publicKey && (
      <div className="container">
        <div className="row">
          {availbleNFTs.map((nft: any) => {
            return (
              <div className="col" key={nft.mint}>
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{nft.storageData.name}</h5>
                    <Image
                      src={nft.storageData.image}
                      width="100px"
                      height="100px"
                      alt={nft.mint}
                    />
                    <div className="row">
                      <div className="col" key={nft.mint}>
                        <a href="#" className="btn btn-primary">
                          Yes
                        </a>
                      </div>
                      <div className="col" key={nft.mint}>
                        <a href="#" className="btn btn-primary">
                          No
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )) ||
    null;

  return (
    <div className={styles.container}>
      <Head>
        <title>Solana | DAO Vote</title>
        <meta name="description" content="voting for DAOs on Solana" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className="p-3 pb-md-4 mx-auto text-center">
          <h1 className="display-4 fw-normal">MonkeDao Vote</h1>
          <p className="fs-5 text-muted">
            Vote for proposals put forth by the MonkeDAO on-chain by connecting
            your wallet. Have your voice be heard. Each SMB can vote once for a
            proposal, if you buy an SMB that has already voted on a particular
            proposal, you CANNOT vote again using it.
          </p>
        </div>
        {/* {nftsForCreatorInWallet} */}
        <div className="row justify-content-start">
          {proposals.map((proposal: any) => {
            const filteredVotes = votes.filter(
              (vote: any) => vote.id === proposal.proposalId
            );

            return renderVotesForProposal(proposal, filteredVotes);
          })}
        </div>
      </main>
    </div>
  );
};

export default Home;
