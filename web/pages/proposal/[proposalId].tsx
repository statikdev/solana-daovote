import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import BN from 'bn.js';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';

import {
  METAPLEX_METADATA_PROGRAM_ADDRESS,
  VOTE_PROGRAM_ADDRESS,
} from '../../constants/addresses';
import { toU64Le } from '../../utils';

import { getNFTsForWallet, getNFTDataForMint } from '../../services/NFT';

const VoteProgramAddressPubKey = new PublicKey(VOTE_PROGRAM_ADDRESS);
const MetaplexMetadataProgramAddressPubKey = new PublicKey(
  METAPLEX_METADATA_PROGRAM_ADDRESS
);

const NFT_CREATOR_ADDRESS = '7V5HgodrUb1jebRpFDsxTnYMKvEbMvbpTLn9kCinHPdd';
const CreatorAddressPublicKey = new PublicKey(NFT_CREATOR_ADDRESS);

const Home: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const isConnected = !!publicKey;

  const [availbleNFTs, setAvailableNFTs] = useState<any>([]);
  const [votes, setVotes] = useState<any>([]);
  const [nftImagesToShow, setNFTImagesToShow] = useState<any>([]);

  const router = useRouter();
  const { proposalId } = router.query;

  useEffect(() => {
    async function retrieve() {
      const gpa = await connection.getProgramAccounts(
        VoteProgramAddressPubKey,
        {
          filters: [
            { memcmp: { bytes: NFT_CREATOR_ADDRESS, offset: 32 } },
            { dataSize: 116 },
          ],
        }
      );

      const votes = gpa
        .map((e) => {
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
            vote_option = new BN(
              e.account.data.slice(108),
              10,
              'le'
            ).toString();
          return { voter, creator, mint, vote, vote_option, time };
        })
        .filter((proposal) => proposal.vote === proposalId);

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
  }, [connection, publicKey]);

  const castVote = useCallback(
    async (mintTokenId: PublicKey, voteId: number, vote: number) => {
      if (!publicKey) {
        return;
      }

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

        const result = await connection.confirmTransaction(
          signature,
          'confirmed'
        );

        console.log(result);
      } catch (e: any) {
        const logs = e?.logs;
        let error = 'Unknown error occurred.';
        console.log(e);
        if (logs) {
          error = logs[logs.length - 3].split(' ').splice(2).join(' ');
        }
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

  function renderVotesForProposal(proposalId: any, votes: any) {
    const votesView = votes.map((d: any) => {
      const mintImageUrl = nftImagesToShow.find(
        (record: any) => record.mint === d.mint
      )?.data?.image;
      return (
        <div key={d.time.toISOString()}>
          <b>Vote</b> <br />
          <u>By: </u>
          {d.voter}
          <br />
          <u>NFT Authority: </u>
          {d.creator}
          <br />
          <u>Mint Token: </u>
          {d.mint}
          {mintImageUrl && (
            <img src={mintImageUrl} width="32px" height="32px" />
          )}
          <br />
          <u>Vote Id: </u>
          {d.vote}
          <br />
          <u>Vote: </u>
          {d.vote_option}
          <br />
          {d.time.toISOString()}
        </div>
      );
    });

    return (
      <>
        <h3>Proposal {proposalId}</h3>
        <div>{votesView}</div>
      </>
    );
  }

  if (!proposalId) {
    return <span>Invalid Proposal Id</span>;
  }

  const nftsForCreatorInWallet =
    (publicKey && (
      <div style={{ paddingTop: '30px', paddingBottom: '30px' }}>
        {availbleNFTs.map((nft: any) => {
          return (
            <span key={nft.mint}>
              <Image
                src={nft.storageData.image}
                width="100px"
                height="100px"
                alt={nft.mint}
              />
            </span>
          );
        })}
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
        {nftsForCreatorInWallet}
        <div style={{ paddingTop: '30px', paddingBottom: '30px' }}>
          {Object.keys(votesById).map((voteId: any) => {
            const votes = votesById[voteId];

            return renderVotesForProposal(voteId, votes);
          })}
        </div>

        {(isConnected && (
          <div>
            <button
              onClick={() => {
                castVote(
                  new PublicKey('GUEKjHs9sVT4q5xiJ8GupquhgKWs5XHMHcPVkbbAiEwu'),
                  +proposalId,
                  1
                );
              }}
            >
              VOTE YES
            </button>
            <button
              onClick={() => {
                castVote(
                  new PublicKey('GUEKjHs9sVT4q5xiJ8GupquhgKWs5XHMHcPVkbbAiEwu'),
                  +proposalId,
                  0
                );
              }}
            >
              VOTE NO
            </button>
          </div>
        )) ||
          null}
      </main>
    </div>
  );
};

export default Home;
