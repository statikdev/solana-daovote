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

const Home: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [availbleNFTs, setAvailableNFTs] = useState<any>([]);
  const [votes, setVotes] = useState<any>([]);
  const [nftImagesToShow, setNFTImagesToShow] = useState<any>([]);

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

  function renderVotesForProposal(proposalId: any, votes: any) {
    const voteResultsCount = votes.reduce((acc: any, vote: any) => {
      if (!acc[vote.vote_option]) {
        acc[vote.vote_option] = {
          option: vote.vote_option,
          count: 0,
        };
      }

      acc[vote.vote_option].count++;

      return acc;
    }, {});

    return (
      <>
        <Link href={`/proposal/${proposalId}`} passHref>
          <h3>Proposal {proposalId}</h3>
        </Link>
        <div>
          {Object.keys(voteResultsCount).map((voteOption: any) => {
            const voteResultForOption = voteResultsCount[voteOption];
            return (
              <span key={voteOption}>
                <b>Option: {voteOption}</b> - Total: {voteResultForOption.count}
              </span>
            );
          })}
        </div>
      </>
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
        {nftsForCreatorInWallet}
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
