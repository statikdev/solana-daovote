import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { Connection, PublicKey } from '@solana/web3.js';

import { getNFTsForWallet } from '../../services/NFT';

import { NFTWithMetadata, VoteOption } from '../../types';

export default function NFTCards({
  connection,
  nftCreatorAddress,
  onSelectAction,
  onAllSelectAction,
  selectedNFTMintAddress,
  unavailableNFTs,
  votes,
  voteOptions = [],
  walletAddress,
}: {
  connection: Connection;
  nftCreatorAddress: string;
  onSelectAction: (nftMintAddress: string) => void;
  onAllSelectAction: (allAvailableNfts: []) => void;
  votes: Array<any>;
  voteOptions: Array<VoteOption> | undefined;
  selectedNFTMintAddress?: Array<any>;
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

  const selectAvailableNfts = () => {
    const notVotedNfts: any = [];
    nftsWithMetadata.map((record) => {
      const isAvailable = !unavailableNFTs.some(
        (nft: any) => nft === record.mintAddress
      );
      isAvailable && notVotedNfts.push(record.mintAddress);
    });
    onAllSelectAction(notVotedNfts);
  };

  return (
    <>
      <h3>Your Votes</h3>
      <div className="row gx-3 gy-3">
        {nftsWithMetadata.map((record: NFTWithMetadata) => {
          const imageView = (
            <img
              src={record.imageUrl}
              width="100px"
              height="100px"
              alt={record.name}
            />
          );

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
          if (
            selectedNFTMintAddress?.find(
              (currentRecord) => currentRecord === record?.mintAddress
            )
          ) {
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
                  {imageView}
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
      <div className="row">
        <div className="col-2">
          <button
            type="button"
            className="btn btn-dark mt-3 mb-5"
            onClick={selectAvailableNfts}
          >
            Select All
          </button>
        </div>
        <div className="col-2">
          <button
            type="button"
            className="btn btn-secondary mt-3 mb-5"
            onClick={() => {
              onAllSelectAction([]);
            }}
          >
            Unselect All
          </button>
        </div>
      </div>
    </>
  );
}
