import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Base58 from 'bs58';
import styles from '../../styles/Home.module.css';
import BN from 'bn.js';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';

import NFTCards from '../../components/NFTCards';
import {
  METAPLEX_METADATA_PROGRAM_ADDRESS,
  VOTE_PROGRAM_ADDRESS,
} from '../../constants/addresses';
import { toU64Le } from '../../utils';

import { getNFTsForWallet, getNFTDataForMint } from '../../services/NFT';
import { ProposalInfo, VoteOption } from '../../types';

const VoteProgramAddressPubKey = new PublicKey(VOTE_PROGRAM_ADDRESS);
const MetaplexMetadataProgramAddressPubKey = new PublicKey(
  METAPLEX_METADATA_PROGRAM_ADDRESS
);

const NFT_CREATOR_ADDRESS = '7V5HgodrUb1jebRpFDsxTnYMKvEbMvbpTLn9kCinHPdd';
const CreatorAddressPublicKey = new PublicKey(NFT_CREATOR_ADDRESS);

const Home: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [availableNfts, setAvailableNFTs] = useState<any>([]);

  const isConnected = !!publicKey;

  const [isVotingActionInProgress, setVotingActionInProgress] =
    useState<boolean>(false);
  const [votes, setVotes] = useState<any>([]);
  const [nftImagesToShow, setNFTImagesToShow] = useState<any>([]);
  const [selectedNFTMintAddress, setSelectedNFTMintAddress] = useState<
    string | undefined
  >(undefined);
  const [proposalInfo, setProposalInfo] = useState<ProposalInfo | null>(null);
  const [isLoading, setIsLoading] = useState<Boolean>(false);

  const router = useRouter();
  const { proposalId } = router.query;

  useEffect(() => {
    async function retrieveProposal() {
      setIsLoading(true);
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
        setIsLoading(false);
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
      } catch (e) {}

      setIsLoading(false);
    }

    async function retrieve() {
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

      setVotes(votes);
    }

    retrieve();
    retrieveProposal();
  }, [connection, publicKey]);

  const castVote = useCallback(
    async (mintTokenId: PublicKey, voteId: number, vote: number) => {
      if (!publicKey) {
        return;
      }

      setVotingActionInProgress(true);

      const token_key = (await connection.getTokenLargestAccounts(mintTokenId))
        .value[0].address;

      console.log(token_key.toString());
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
          isSigner: false,
          isWritable: true,
        },
        account_1 = { pubkey: mintTokenId, isSigner: false, isWritable: false },
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

      let transaction = new Transaction().add(instruction);

      transaction.recentBlockhash = (
        await connection.getRecentBlockhash()
      ).blockhash;
      transaction.feePayer = publicKey;

      try {
        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
        });

        console.log('Tx Id: ', signature);

        const result = await connection.confirmTransaction(
          signature,
          'finalized'
        );

        setVotingActionInProgress(false);
      } catch (e: any) {
        const logs = e?.logs;
        let error = 'Unknown error occurred.';
        console.log(e);
        if (logs) {
          error = logs[logs.length - 3].split(' ').splice(2).join(' ');
        }
        setVotingActionInProgress(false);
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

  const votesById = votes.reduce((acc: any, vote: any) => {
    if (!acc[vote.vote]) {
      acc[vote.vote] = [];
    }

    acc[vote.vote].push(vote);
    return acc;
  }, {});

  const unavailableNFTs = votes.map((vote: any) => {
    return vote.mint;
  });

  function renderVotesForProposal(proposalId: any, votes: any) {
    const votesView = votes.map((d: any) => {
      const mintData = nftImagesToShow
        .filter((mint: any) => !!mint.data)
        .find((record: any) => record.mint === d.mint)?.data;

      const voteOption = proposalInfo?.voteOptions?.find(
        (voteOption) => voteOption.value === Number(d.vote_option)
      );
      return (
        <div
          className="col-4"
          key={d.time.toISOString()}
          d-flex
          align-items-stretch
        >
          <div className="card">
            <div className="card-body">
              {mintData && mintData.name && (
                <h5 className="card-title">{mintData.name}</h5>
              )}
              <h6 className="card-subtitle mb-3 text-muted">{d.mint}</h6>{' '}
              {mintData && mintData.image && (
                <Image
                  src={mintData.image}
                  width="100px"
                  height="100px"
                  alt={d.mint}
                />
              )}
            </div>
            <div className="card-footer bg-dark">
              <small className="text-white">
                <h6>
                  {d.voter} voted for {voteOption?.label}
                </h6>
              </small>
            </div>
          </div>
        </div>
      );
    });

    return (
      <>
        <h3>All Votes</h3>
        <div className="row gx-3 gy-3">{votesView}</div>
      </>
    );
  }
  const nftsForCreatorInWallet =
    (publicKey && (
      <NFTCards
        connection={connection}
        nftCreatorAddress={NFT_CREATOR_ADDRESS}
        onSelectAction={(newSelectedNFTMintAddress) =>
          setSelectedNFTMintAddress(newSelectedNFTMintAddress)
        }
        votes={votes}
        voteOptions={proposalInfo?.voteOptions}
        selectedNFTMintAddress={selectedNFTMintAddress}
        unavailableNFTs={unavailableNFTs}
        walletAddress={publicKey.toString()}
      />
    )) ||
    null;

  if (!proposalId) {
    return <span>Invalid Proposal Id</span>;
  }

  const disableVoting = isVotingActionInProgress || !selectedNFTMintAddress;

  const mainView = isLoading ? (
    <span>loading...</span>
  ) : (
    <>
      <h2 className="text-center">
        {proposalInfo?.prompt || 'Unable to load'}
      </h2>
      <div className="badge bg-secondary mt-2 p-2">
        <i className="bi bi-calendar2-check me-2"></i>
        {proposalInfo?.proposalDate}
      </div>
      <p className="mt-3"></p>
      <div className="row justify-content-end">
        <div className="col-4">
          <p className="fw-bold">{proposalInfo?.proposalEndDate}</p>
        </div>
        <div className="col-4">
          <p className="fw-bold">Total Votes: {votes.length}</p>
        </div>
      </div>
    </>
  );

  const votingInActionView = isVotingActionInProgress ? (
    <div className="fw-bold">
      {isVotingActionInProgress ? 'Voting...' : 'Select Option: '}
    </div>
  ) : null;

  const votingOptionsView =
    proposalInfo?.voteOptions?.map((voteOption: VoteOption) => {
      const btnType =
        voteOption.value === 0 ? ' btn-danger' : ' btn-success me-2';

      return (
        <>
          <button
            disabled={disableVoting}
            onClick={() => {
              if (disableVoting) {
                return;
              }

              castVote(
                new PublicKey(selectedNFTMintAddress),
                +proposalId,
                voteOption.value
              );
            }}
            className={`btn ${btnType}`}
          >
            VOTE {voteOption.label.toUpperCase()}
          </button>
        </>
      );
    }) || [];

  return (
    <div className={styles.container}>
      <Head>
        <title>Solana | DAO Vote</title>
        <meta name="description" content="voting for DAOs on Solana" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h3 className="fw-normal text-center">Proposal {proposalId}</h3>
        {mainView}
        {nftsForCreatorInWallet}
        {(isConnected && (
          <div style={{ paddingTop: '15px' }}>
            {votingInActionView || votingOptionsView}
          </div>
        )) ||
          null}

        <div style={{ paddingTop: '30px', paddingBottom: '30px' }}>
          {Object.keys(votesById).map((voteId: any) => {
            const votes = votesById[voteId];

            return renderVotesForProposal(voteId, votes);
          })}
        </div>
      </main>
    </div>
  );
};

export default Home;
