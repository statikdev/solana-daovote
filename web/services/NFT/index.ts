import { Connection, PublicKey } from '@solana/web3.js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
export async function getMetadataForMint(
  connection: Connection,
  tokenAddress: PublicKey
) {
  const nftPDA = await Metadata.getPDA(tokenAddress);
  const metadata = await Metadata.load(connection, nftPDA);
  return metadata;
}

export async function getNFTDataForMint(
  connection: Connection,
  mintAddress: PublicKey
) {
  const onchainData = await Metadata.findByMint(connection, mintAddress);
  return await retrieveStorageDataForUrl(onchainData.data.data.uri);
}

export async function retrieveStorageDataForUrl(uri: string) {
  try {
    const response = await fetch(uri);
    return await response.json();
  } catch (e) {
    console.error(e);
  }

  return null;
}

export async function getNFTsForWallet(
  connection: Connection,
  walletAddress: PublicKey,
  verifiedCreatorAddress: string
) {
  const response = await connection.getParsedTokenAccountsByOwner(
    walletAddress,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  console.log('responses', response);

  const mints = await Promise.all(
    response.value
      .filter(
        (accInfo) =>
          accInfo.account.data.parsed.info.tokenAmount.uiAmount == 1 &&
          accInfo.account.data.parsed.info.tokenAmount.decimals == 0
      )
      .map((accInfo) =>
        getMetadataForMint(connection, accInfo.account.data.parsed.info.mint)
      )
  );

  const filteredMints = mints.filter((mint) => {
    return mint?.data?.data?.creators?.find(
      (creator) =>
        creator.verified && creator.address === verifiedCreatorAddress
    );
  });

  return Promise.all(
    filteredMints.map(async (filteredMint) => {
      const data = await retrieveStorageDataForUrl(filteredMint.data.data.uri);
      return {
        chainData: filteredMint,
        mint: filteredMint.data.mint,
        storageData: data,
        tokenAddress: filteredMint.pubkey.toString(),
      };
    })
  );
}
