import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { Connection, PublicKey } from '@solana/web3.js';

import { getNFTsForWallet } from '../../services/NFT';

import { NFTWithMetadata, VoteOption } from '../../types';

export default function NFTCards({
  connection,
  nftCreatorAddress,
  onSelectAction,
  selectedNFTMintAddress,
  unavailableNFTs,
  votes,
  voteOptions,
  walletAddress,
}: {
  connection: Connection;
  nftCreatorAddress: string;
  onSelectAction: (nftMintAddress: string) => void;
  votes: Array<any>;
  voteOptions: Array<VoteOption>;
  selectedNFTMintAddress?: string;
  unavailableNFTs: Array<string>;
  walletAddress: string;
}) {
  const [nftsWithMetadata, setNFTsWithMetadata] = useState<NFTWithMetadata[]>(
    []
  );

  useEffect(() => {
    async function retrieve() {
      const nfts = await getNFTsForWallet(
        connection,
        new PublicKey(walletAddress),
        nftCreatorAddress
      );

      const nftsWithData = nfts.map((nft: any) => ({
        imageUrl: nft.storageData?.image,
        mintAddress: nft.mint,
        name: nft.storageData?.name,
      }));

      setNFTsWithMetadata(nftsWithData);
    }
    retrieve();
  }, [connection, nftCreatorAddress, walletAddress]);

  return (
    <>
      <h3>Your Votes</h3>
      <div className="row gx-3 gy-3">
        {nftsWithMetadata.map((record: NFTWithMetadata) => {
          const isAvailableForSelection = !unavailableNFTs.some(
            (nft: any) => nft === record.mintAddress
          );
          let hasVotedCard, voteForMint: any, selectedCard;
          if (!isAvailableForSelection) {
            hasVotedCard = 'text-white bg-secondary';
            voteForMint = votes.find(
              (vote) => vote.mint === record.mintAddress
            );
          }

          const voteOptionLabel = voteOptions.find((voteOption: VoteOption) => {
            return voteOption.value === Number(voteForMint?.vote_option);
          })?.label;
          if (selectedNFTMintAddress === record.mintAddress) {
            selectedCard = 'border-success border-4';
          }
          return (
            <div
              className="col-4"
              key={record.mintAddress}
              d-flex
              align-items-stretch
            >
              <div
                className={`card ${selectedCard} ${hasVotedCard}`}
                onClick={() => {
                  if (!isAvailableForSelection) {
                    return;
                  }
                  onSelectAction(record.mintAddress);
                }}
              >
                <div className="card-body">
                  <h5 className="card-title">{record.name}</h5>
                  <Image
                    src={record.imageUrl}
                    width="100px"
                    height="100px"
                    alt={record.name}
                  />
                </div>
                <div className="card-footer bg-white">
                  <small className="text-dark">
                    {voteForMint ? (
                      <h4>Your vote is for option {voteOptionLabel}</h4>
                    ) : (
                      <h4>You have not voted</h4>
                    )}
                  </small>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
