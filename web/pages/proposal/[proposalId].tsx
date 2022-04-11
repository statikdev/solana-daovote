import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import Base58 from 'bs58';
import styles from '../../styles/Home.module.css';
import BN from 'bn.js';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { Snackbar } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { format } from 'date-fns';
import Countdown, { CountdownRendererFn } from 'react-countdown';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import NFTCards from '../../components/NFTCards';
import VoteHistory from '../../components/VoteHistory';
import {
  METAPLEX_METADATA_PROGRAM_ADDRESS,
  VOTE_PROGRAM_ADDRESS,
} from '../../constants/addresses';
import { toU64Le } from '../../utils';

import { getNFTsForWallet, getNFTDataForMint } from '../../services/NFT';
import {
  Proposal,
  ProposalInfo,
  VoteOption,
  VoteOptionWithResult,
} from '../../types';

const VoteProgramAddressPubKey = new PublicKey(VOTE_PROGRAM_ADDRESS);
const MetaplexMetadataProgramAddressPubKey = new PublicKey(
  METAPLEX_METADATA_PROGRAM_ADDRESS
);

const NFT_CREATOR_ADDRESS = 'E595MwLgTJapMQjcnsQ4bARCVF2wBMxhWb8YPciyHKaz';
const CreatorAddressPublicKey = new PublicKey(NFT_CREATOR_ADDRESS);

const renderer = (callback: () => void) => {
  const fn: CountdownRendererFn = ({
    days,
    hours,
    minutes,
    seconds,
  }: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }) => {
    if (days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) {
      callback();
      return null;
    }

    return (
      <div className="mt-5 d-flex justify-content-center">
        <h3>
          <div className="alert alert-secondary" role="alert">
            Voting Opens in{' '}
            {hours + ' hours ' + minutes + ' minutes ' + seconds + ' seconds '}
          </div>
        </h3>
      </div>
    );
  };

  return fn;
};

const Home: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signAllTransactions } = useWallet();
  const [availableNfts, setAvailableNFTs] = useState<any>([]);

  const isConnected = !!publicKey;

  const [isVotingActionInProgress, setVotingActionInProgress] =
    useState<boolean>(false);
  const [votes, setVotes] = useState<any>([]);
  const [nftImagesToShow, setNFTImagesToShow] = useState<any>([]);
  const [selectedNFTMintAddress, setSelectedNFTMintAddress] = useState<
    Array<any>
  >([]);
  const [proposalInfo, setProposalInfo] = useState<ProposalInfo | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoadingProposal, setIsLoadingProposal] = useState<Boolean>(false);
  const [isLoadingVotes, setIsLoadingVotes] = useState<Boolean>(false);
  const [isVoteAllowed, setIsVoteAllowed] = useState<Boolean>(false);
  const [alertState, setAlertState] = useState<any>({
    open: false,
    message: '',
    severity: undefined,
  });
  const router = useRouter();
  const urlParams = router.query;
  const proposalId = Number(urlParams.proposalId);

  useEffect(() => {
    async function retrieveProposal() {
      setIsLoadingProposal(true);
      const proposalPDA = (
        await PublicKey.findProgramAddress(
          [
            new PublicKey(NFT_CREATOR_ADDRESS).toBuffer(),
            toU64Le(+proposalId!),
          ],
          VoteProgramAddressPubKey
        )
      )[0];

      const proposalAccount = await connection.getAccountInfo(proposalPDA);
      if (!proposalAccount || !proposalAccount.data) {
        setIsLoadingProposal(false);
        return;
      }

      const urlBytes = proposalAccount.data.slice(0, 100);
      const url = String.fromCharCode(
        ...Array.from(urlBytes).filter((e) => e > 0)
      );

      let proposalInfo: ProposalInfo | null = null;
      try {
        const proposalInfoRequest = await fetch(url + '?type=json');
        proposalInfo = JSON.parse(await proposalInfoRequest.text());

        setProposalInfo(proposalInfo);
        setProposal({
          id: proposalId,
          info: proposalInfo!,
          url,
        });
      } catch (e) {}

      setIsLoadingProposal(false);
    }

    async function retrieve() {
      setIsLoadingVotes(true);
      const gpa = await connection.getProgramAccounts(
        VoteProgramAddressPubKey,
        {
          filters: [
            { memcmp: { bytes: NFT_CREATOR_ADDRESS, offset: 32 } },
            {
              memcmp: {
                bytes: Base58.encode(toU64Le(+proposalId!)),
                offset: 96,
              },
            },
            { dataSize: 116 },
          ],
        }
      );

      const votes = gpa.map((e) => {
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
      setIsLoadingVotes(false);
      setVotes(votes);
    }

    retrieve();
    retrieveProposal();
  }, [connection, publicKey, isVotingActionInProgress]);

  const castVote = useCallback(
    async (mintTokenIds: PublicKey[], voteId: number, vote: number) => {
      if (!publicKey) {
        return;
      }

      setVotingActionInProgress(true);
      let voteInstructions: TransactionInstruction[] = [];
      for (let mintTokenId of mintTokenIds) {
        const token_key = (
          await connection.getTokenLargestAccounts(mintTokenId)
        ).value[0].address;

        const meta_key = (
          await PublicKey.findProgramAddress(
            [
              new Uint8Array([109, 101, 116, 97, 100, 97, 116, 97]),
              MetaplexMetadataProgramAddressPubKey.toBuffer(),
              mintTokenId.toBuffer(),
            ],
            MetaplexMetadataProgramAddressPubKey
          )
        )[0];
        const auth_key = (
          await PublicKey.findProgramAddress(
            [mintTokenId.toBuffer(), toU64Le(voteId)],
            VoteProgramAddressPubKey
          )
        )[0];
        const vote_auth_key = (
          await PublicKey.findProgramAddress(
            [CreatorAddressPublicKey.toBuffer(), toU64Le(voteId)],
            VoteProgramAddressPubKey
          )
        )[0];
        const sys_key = new PublicKey('11111111111111111111111111111111');

        let account_0 = {
            pubkey: publicKey,
            isSigner: true,
            isWritable: true,
          },
          account_1 = {
            pubkey: mintTokenId,
            isSigner: false,
            isWritable: false,
          },
          account_2 = { pubkey: token_key, isSigner: false, isWritable: false },
          account_3 = { pubkey: meta_key, isSigner: false, isWritable: false },
          account_4 = { pubkey: auth_key, isSigner: false, isWritable: true },
          account_5 = { pubkey: sys_key, isSigner: false, isWritable: false },
          account_6 = {
            pubkey: vote_auth_key,
            isSigner: false,
            isWritable: false,
          };

        const instruction = new TransactionInstruction({
          keys: [
            account_0,
            account_1,
            account_2,
            account_3,
            account_4,
            account_5,
            account_6,
          ],
          programId: VoteProgramAddressPubKey,
          data: Buffer.from(
            new Uint8Array(
              [1]
                .concat(Array.from(toU64Le(voteId)))
                .concat(Array.from(toU64Le(vote)))
            )
          ),
        });
        voteInstructions.push(instruction);
      }

      const chunkedInstructions = Array.from(
        { length: Math.ceil(voteInstructions.length / 5) },
        (v, i) => voteInstructions.slice(i * 5, i * 5 + 5)
      );
      const transactionArr: Transaction[] = [];
      for (let txns of chunkedInstructions) {
        let transaction = new Transaction();
        for (let ins of txns) {
          transaction.add(ins);
        }
        transaction.recentBlockhash = (
          await connection.getRecentBlockhash()
        ).blockhash;
        transaction.feePayer = publicKey;
        transactionArr.push(transaction);
      }
      let errorMessage: any = '';
      if (signAllTransactions) {
        try {
          const txns = await signAllTransactions(transactionArr);
          const sendPromises = txns.map((txn) =>
            connection.sendRawTransaction(txn.serialize(), {
              skipPreflight: true,
              maxRetries: 100,
            })
          );
          const result = await Promise.all(sendPromises);

          const confirmPromises = result.map((tx) =>
            connection.confirmTransaction(tx, 'finalized')
          );
          const confirmResult = await Promise.all(confirmPromises);
          console.log(confirmResult);
          console.log(result);
        } catch (err: any) {
          console.error(err);
          errorMessage = err;
          setVotingActionInProgress(false);
        }
      } else {
        for (let transaction of transactionArr) {
          try {
            const signature = await sendTransaction(transaction, connection, {
              skipPreflight: true,
            });
            const result = await connection.confirmTransaction(
              signature,
              'finalized'
            );
          } catch (e: any) {
            const logs = e?.logs;
            let error = 'Unknown error occurred.';
            console.error(e);
            if (logs) {
              error = logs[logs.length - 3].split(' ').splice(2).join(' ');
            }
            errorMessage = e;
            setVotingActionInProgress(false);
          }
        }
      }

      setVotingActionInProgress(false);
      setSelectedNFTMintAddress([]);
      if (errorMessage !== '') {
        setAlertState({
          open: true,
          message: 'Your vote failed :( Please try again!',
          severity: 'error',
        });
      } else {
        setAlertState({
          open: true,
          message: 'Congratulations! Your vote was recorded.',
          severity: 'success',
        });
      }
    },
    [connection, publicKey]
  );

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

  const votesForProposal = votes.reduce((acc: any, vote: any) => {
    const voteProposalId = Number(vote.vote);

    if (proposalId !== voteProposalId) {
      return acc;
    }

    acc.push(vote);
    return acc;
  }, []);

  const unavailableNFTs = votes.map((vote: any) => {
    return vote.mint;
  });

  const nftsForCreatorInWallet =
    (publicKey && isVoteAllowed && (
      <>
        <NFTCards
          connection={connection}
          nftCreatorAddress={NFT_CREATOR_ADDRESS}
          onSelectAction={(selectedNFTMintAddress) => {
            const newSelectedNFTMintAddress = [];
            newSelectedNFTMintAddress.push(selectedNFTMintAddress);
            setSelectedNFTMintAddress(newSelectedNFTMintAddress);
          }}
          onAllSelectAction={(allAvailableNfts) => {
            setSelectedNFTMintAddress(allAvailableNfts);
          }}
          votes={votes}
          voteOptions={proposalInfo?.voteOptions || []}
          selectedNFTMintAddress={selectedNFTMintAddress}
          unavailableNFTs={unavailableNFTs}
          walletAddress={publicKey.toString()}
        />
      </>
    )) ||
    null;

  if (!proposalId) {
    return <span>Invalid Proposal Id</span>;
  }

  const disableVoting = proposalId !== 1 &&
    (isVotingActionInProgress ||
    selectedNFTMintAddress.length === 0 ||
    !isVoteAllowed);

  const renderVoteData = (votes: any, proposalInfo?: ProposalInfo) => {
    if (!proposalInfo) {
      return null;
    }
    const voteResultsCount = proposalInfo?.voteOptions.map(
      (voteOption: VoteOption) => {
        const voteOptionWithResults: VoteOptionWithResult = {
          ...voteOption,
          count: votes.filter((vote: any) => {
            return Number(vote.vote_option) === voteOption.value;
          }).length,
        };

        return voteOptionWithResults;
      },
      {}
    );

    const totalVotePercentage =
      Number(votes.length / 5000) * 100;
    const totalVotePercentageLabel =
      totalVotePercentage < 1 ? '<1%' : `${totalVotePercentage.toFixed(0)}%`;

    return (
      <div className="row">
        <div className="col-sm-6">
          <h3 className="card-title">
            {votes.length} / 5,000
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
    );
  };

  const mainView =
    isLoadingProposal || !proposalInfo ? (
      <div className="spinner-border text-dark" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    ) : (
      <>
        <div className="mb-2">
          <Link href="/" passHref>
            <a className="text-dark ">← &nbsp;&nbsp;Go Back</a>
          </Link>
        </div>
        <div className="row g-0 border bg-white rounded overflow-hidden flex-md-row mb-4 shadow-sm h-md-250 position-relative">
          <div className="col p-4 d-flex flex-column position-static">
            <div className="d-inline-block  mb-2 ">
              <h4>
                <span className="badge bg-light text-dark font-weight-bold pl-5">
                  Proposal #{proposalId}
                </span>
              </h4>
            </div>
            <h3 className="mb-0">{proposalInfo?.prompt || 'Unable to load'}</h3>
            <div className="mb-1 text-muted">
              {proposalInfo ? (
                <div className="badge bg-light text-dark mt-2 p-2">
                  <i className="bi bi-calendar2-check me-2"></i>
                  {format(new Date(proposalInfo?.proposalDate), 'E MM/dd/yyyy')}
                </div>
              ) : null}
            </div>
            <p className="mb-auto mt-3">{proposalInfo?.description}</p>
            <div className="row" style={{ paddingTop: '55px' }}>
              <div className="col-lg-6">
                {renderVoteData(votes, proposalInfo)}
              </div>

              <div className="col-lg-6">
                <div className="d-flex justify-content-end">
                  <p className="fw-bold">
                    <span>End Date: </span>
                    {proposalInfo?.proposalEndDate
                      ? format(
                          new Date(proposalInfo?.proposalEndDate),
                          'E MM/dd/yyyy'
                        )
                      : ''}
                  </p>
                </div>
                {/* <div className="d-flex justify-content-end pt-2">
                  <Link href={proposalInfo.documentProposalUri} passHref>
                    <a
                      rel="noopener noreferrer"
                      target="_blank"
                      className="btn btn-primary"
                    >
                      → View Detailed Proposal
                    </a>
                  </Link>
                  &nbsp;&nbsp;
                  <img
                    src="/arweave.svg"
                    height="32px"
                    width="32px"
                    alt="arweave"
                  />
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </>
    );

  const votingInActionView = isVotingActionInProgress ? (
    <div className="d-flex mt-3">
      <h3 className="">VOTING IN PROGRESS...</h3>
      <div className="spinner-border text-dark" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  ) : null;

  const votingOptionsView =
    proposalInfo?.voteOptions?.map((voteOption: VoteOption) => {
      const btnType = ' btn-primary';

      return (
        <div key={voteOption.label} className="col-2">
          <button
            disabled={disableVoting}
            onClick={() => {
              if (disableVoting) {
                return;
              }
              castVote(
                selectedNFTMintAddress.map((mintId) => new PublicKey(mintId)),
                +proposalId,
                voteOption.value
              );
            }}
            className={`btn btn-lg ${btnType}`}
          >
            VOTE {voteOption.label.toUpperCase()}
          </button>
        </div>
      );
    }) || [];

  let votingView = null;

  if (publicKey && isVoteAllowed) {
    votingView = (
      <div className="d-flex pt-10">
        {votingInActionView || votingOptionsView}
      </div>
    );
  }

  if (isVoteAllowed && !publicKey) {
    votingView = (
      <div className="">
        <WalletMultiButton>Connect Wallet to Place Vote</WalletMultiButton>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Balloonsville | Vote Proposal {proposalId}</title>
        <meta name="description" content="Balloonsville | Vote" />
      </Head>

      <main className={styles.main}>
        {mainView}
        {nftsForCreatorInWallet}
        {votingView}
        {isLoadingProposal ? (
          ''
        ) : (
          <div>
            <Countdown
              renderer={renderer(() => {
                setIsVoteAllowed(true);
              })}
              date={proposalInfo?.proposalDate!}
            />
          </div>
        )}

        {isLoadingVotes ? (
          <div className="spinner-border text-dark mt-5" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        ) : isVoteAllowed ? (
          <VoteHistory
            proposalInfo={proposalInfo}
            nftImages={nftImagesToShow}
            proposalId={proposalId}
            votes={votesForProposal}
          />
        ) : null}
      </main>
      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Home;
