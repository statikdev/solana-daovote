import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import BN from 'bn.js';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

import { VOTE_PROGRAM_ADDRESS } from '../constants/addresses';

import { getNFTsForWallet, getNFTDataForMint } from '../services/NFT';

import {
  ProposalInfo,
  Proposal,
  VoteOption,
  VoteOptionWithResult,
} from '../types';

const VoteProgramAddressPubKey = new PublicKey(VOTE_PROGRAM_ADDRESS);

const NFT_CREATOR_ADDRESS = '9uBX3ASjxWvNBAD1xjbVaKA74mWGZys3RGSF7DdeDD3F';

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
          filters: [
            { memcmp: { bytes: NFT_CREATOR_ADDRESS, offset: 116 } },
            {
              dataSize: 148,
            },
          ],
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

    const totalVotePercentage =
      Number(totalVotes / proposal.info.totalVotesAvailable) * 100;
    const totalVotePercentageLabel =
      totalVotePercentage < 1 ? '<1%' : `${totalVotePercentage}%`;

    return (
      <div className="col">
        <div className="card mb-4 rounded-3 shadow-sm">
          <div className="card-header py-3 text-white bg-dark">
            <h5>
              <span className="badge bg-light text-dark font-weight-bold pl-5">
                Proposal #{proposalId}
              </span>
            </h5>
            <h4 className="my-0 fw-normal">{proposal.info.prompt}</h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-sm-6">
                <h3 className="card-title">
                  {totalVotes} / {proposal.info.totalVotesAvailable}
                  <small className="text-muted fw-light"> votes</small>
                </h3>
                <div className="progress">
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: `${totalVotePercentage}%`,
                    }}
                    aria-valuenow={totalVotePercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
              </div>
              <div className="col-sm-6 d-flex">
                <div className="w-50 d-flex justify-content-center align-items-center">
                  <h2 className="">{totalVotePercentageLabel}</h2>
                </div>
                <ul className="list-unstyled mt-3 text-right">
                  {voteResultsCount.map(
                    (voteOptionWithResult: VoteOptionWithResult) => {
                      return (
                        <li key={voteOptionWithResult.value}>
                          <strong>{voteOptionWithResult.label}</strong> -{' '}
                          <span className="font-monospace">
                            {voteOptionWithResult.count}
                          </span>
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>
            </div>
          </div>
          <div className="card-footer">
            <div className="d-flex justify-content-between align-items-center">
              <span className="badge bg-light text-secondary p-2">
                <i className="bi bi-calendar2-check me-2"></i>
                {format(
                  new Date(proposal.info?.proposalDate),
                  'E MM/dd/yyyy'
                )}{' '}
                -{' '}
                {format(
                  new Date(proposal.info?.proposalEndDate),
                  'E MM/dd/yyyy'
                )}
              </span>

              <Link href={`/proposal/${proposalId}`} passHref>
                <button type="button" className="btn btn-sm btn-primary">
                  &nbsp;&nbsp;View Details{' '}
                  <i className="bi bi-arrow-right-short"></i>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className="col-12 p-3 pb-md-4 mx-auto text-center">
          <p className="fs-5">
            Vote for proposals put forth by a DAO on-chain by connecting your
            wallet.
            <br />
            This is currently being used by MonkeDAO. Each SMB can vote once for
            a proposal, if you buy an SMB that has already voted on a particular
            proposal, you CANNOT vote again using it.
          </p>
        </div>
        <div className="row justify-content-start">
          <div className="col-6 mx-auto">
            {proposals
              .sort((a: Proposal, b: Proposal) => Number(a.id) - Number(b.id))
              .map((proposal: any) => {
                const filteredVotes = votes.filter(
                  (vote: any) => vote.id === proposal.proposalId
                );

                return renderVotesForProposal(proposal, filteredVotes);
              })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
