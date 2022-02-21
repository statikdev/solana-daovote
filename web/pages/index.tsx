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
    console.log('propose', proposalId, votes);
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
      <div className="col-12">
        <div className="card mb-4 rounded-3 shadow-sm">
          <div className="card-header py-3 text-white bg-dark">
            <h4 className="my-0 fw-normal">
              {' '}
              <h3>Proposal {proposalId}</h3>
            </h4>
          </div>
          <div className="card-body">
            <h1 className="card-title">
              {votes.length}
              <small className="text-muted fw-light"> votes</small>
            </h1>
            <ul className="list-unstyled mt-3 mb-4">
              {Object.keys(voteResultsCount).map((voteOption: any) => {
                const voteResultForOption = voteResultsCount[voteOption];
                return (
                  <li key={voteOption}>
                    <b>Option: {voteOption}</b> - Total:{' '}
                    {voteResultForOption.count}
                  </li>
                );
              })}
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
        <div className="pricing-header p-3 pb-md-4 mx-auto text-center">
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
