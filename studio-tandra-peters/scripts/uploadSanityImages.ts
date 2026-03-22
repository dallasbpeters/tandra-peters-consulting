import type {SanityClient} from '@sanity/client'
import {readFile} from 'node:fs/promises'

export type SanityImageValue = {
  _type: 'image'
  asset: {_type: 'reference'; _ref: string}
}

export const uploadImageFromFile = async (
  client: SanityClient,
  absolutePath: string,
  filename: string,
): Promise<SanityImageValue> => {
  const buffer = await readFile(absolutePath)
  const asset = await client.assets.upload('image', buffer, {filename})
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: asset._id},
  }
}

export const uploadImageFromUrl = async (
  client: SanityClient,
  url: string,
  filename: string,
): Promise<SanityImageValue> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const asset = await client.assets.upload('image', buffer, {filename})
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: asset._id},
  }
}
