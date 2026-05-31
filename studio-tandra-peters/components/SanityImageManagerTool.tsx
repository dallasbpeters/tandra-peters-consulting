import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'
import './sanityImageManagerTool.css'

type SanityImageAsset = {
  _id: string
  _createdAt: string
  altText?: string
  description?: string
  extension?: string
  mimeType?: string
  originalFilename?: string
  size?: number
  title?: string
  url: string
  metadata?: {
    dimensions?: {
      aspectRatio?: number
      height?: number
      width?: number
    }
    lqip?: string
  }
  usedBy?: number
  references?: {
    _id: string
    _type: string
    name?: string
    heading?: string
    title?: string
  }[]
}

const imageAssetQuery = `*[_type == "sanity.imageAsset" && defined(url)] | order(_createdAt desc)[0...200] {
  _id,
  _createdAt,
  altText,
  description,
  extension,
  mimeType,
  originalFilename,
  size,
  title,
  url,
  metadata {
    dimensions {
      aspectRatio,
      height,
      width
    },
    lqip
  },
  "usedBy": count(*[references(^._id) && !(_id in path("_.**"))]),
  "references": *[references(^._id) && !(_id in path("_.**"))][0...8] {
    _id,
    _type,
    name,
    heading,
    title
  }
}`

const fileSize = (bytes?: number): string => {
  if (!bytes) {
    return 'Unknown size'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

const imageDimensions = (asset: SanityImageAsset): string => {
  const width = asset.metadata?.dimensions?.width
  const height = asset.metadata?.dimensions?.height

  if (!width || !height) {
    return 'Unknown dimensions'
  }

  return `${width} x ${height}`
}

const imageLabel = (asset: SanityImageAsset): string =>
  asset.title?.trim() || asset.altText?.trim() || asset.originalFilename?.trim() || 'Untitled image'

const referenceLabel = (reference: NonNullable<SanityImageAsset['references']>[number]) =>
  reference.title?.trim() ||
  reference.heading?.trim() ||
  reference.name?.trim() ||
  `${reference._type} document`

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export function SanityImageManagerTool() {
  const client = useClient({apiVersion: '2026-05-01'})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [assets, setAssets] = useState<SanityImageAsset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftAltText, setDraftAltText] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const nextAssets = await client.fetch<SanityImageAsset[]>(imageAssetQuery)
      setAssets(nextAssets)
      setSelectedAssetId((current) => current ?? nextAssets[0]?._id ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load Sanity images.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return assets
    }

    return assets.filter((asset) =>
      [asset.title, asset.altText, asset.description, asset.originalFilename, asset._id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [assets, search])

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset._id === selectedAssetId) ?? filteredAssets[0] ?? null,
    [assets, filteredAssets, selectedAssetId],
  )

  useEffect(() => {
    setDraftTitle(selectedAsset?.title ?? '')
    setDraftAltText(selectedAsset?.altText ?? '')
    setDraftDescription(selectedAsset?.description ?? '')
  }, [selectedAsset])

  const clearNotice = () => {
    window.setTimeout(() => setNotice(null), 2800)
  }

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) {
      return
    }

    setUploading(true)
    setError(null)
    setNotice(null)

    try {
      const asset = await client.assets.upload('image', file, {
        filename: file.name,
        contentType: file.type,
      })
      await loadAssets()
      setSelectedAssetId(asset._id)
      setNotice('Image uploaded.')
      clearNotice()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload image.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSaveMetadata = async () => {
    if (!selectedAsset) {
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      await client
        .patch(selectedAsset._id)
        .set({
          altText: draftAltText.trim(),
          description: draftDescription.trim(),
          title: draftTitle.trim(),
        })
        .commit()
      await loadAssets()
      setNotice('Image details saved.')
      clearNotice()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save image details.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyUrl = async () => {
    if (!selectedAsset) {
      return
    }

    try {
      await navigator.clipboard.writeText(selectedAsset.url)
      setNotice('Image URL copied.')
      clearNotice()
    } catch {
      setError('Could not copy the image URL.')
    }
  }

  const handleDelete = async () => {
    if (!selectedAsset) {
      return
    }

    const label = imageLabel(selectedAsset)
    const confirmed = window.confirm(
      `Delete "${label}" from Sanity assets? This will fail if Sanity blocks the asset because it is still referenced.`,
    )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      await client.delete(selectedAsset._id)
      setSelectedAssetId(null)
      await loadAssets()
      setNotice('Image deleted.')
      clearNotice()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not delete the image. Check whether it is still referenced.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="sanity-image-manager">
      <header className="sanity-image-manager__header">
        <div>
          <p>Assets</p>
          <h1>Image Manager</h1>
        </div>
        <div className="sanity-image-manager__actions">
          <button disabled={loading} onClick={() => void loadAssets()} type="button">
            Refresh
          </button>
          <label className="sanity-image-manager__upload">
            <input
              accept="image/*"
              disabled={uploading}
              onChange={(event) => void handleUpload(event.currentTarget.files)}
              ref={fileInputRef}
              type="file"
            />
            {uploading ? 'Uploading...' : 'Upload image'}
          </label>
        </div>
      </header>

      {error ? <div className="sanity-image-manager__alert">{error}</div> : null}
      {notice ? <div className="sanity-image-manager__notice">{notice}</div> : null}

      <section className="sanity-image-manager__workspace">
        <aside className="sanity-image-manager__library">
          <div className="sanity-image-manager__search">
            <input
              aria-label="Search images"
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search filename, title, alt text, or asset ID"
              type="search"
              value={search}
            />
          </div>

          <div className="sanity-image-manager__count">
            {loading
              ? 'Loading images...'
              : `${filteredAssets.length} of ${assets.length} images shown`}
          </div>

          <div className="sanity-image-manager__grid">
            {filteredAssets.map((asset) => (
              <button
                className={
                  asset._id === selectedAsset?._id
                    ? 'sanity-image-manager__tile is-selected'
                    : 'sanity-image-manager__tile'
                }
                key={asset._id}
                onClick={() => setSelectedAssetId(asset._id)}
                title={imageLabel(asset)}
                type="button"
              >
                <img
                  alt=""
                  loading="lazy"
                  src={`${asset.url}?w=360&h=260&fit=crop&auto=format`}
                  style={
                    asset.metadata?.lqip
                      ? {backgroundImage: `url(${asset.metadata.lqip})`}
                      : undefined
                  }
                />
                <span>{imageLabel(asset)}</span>
                <small>{imageDimensions(asset)}</small>
              </button>
            ))}
          </div>

          {!loading && filteredAssets.length === 0 ? (
            <div className="sanity-image-manager__empty">No images match that search.</div>
          ) : null}
        </aside>

        <section className="sanity-image-manager__detail">
          {selectedAsset ? (
            <>
              <div className="sanity-image-manager__preview">
                <img alt="" src={`${selectedAsset.url}?w=1200&auto=format`} />
              </div>

              <div className="sanity-image-manager__panel">
                <div className="sanity-image-manager__summary">
                  <div>
                    <h2>{imageLabel(selectedAsset)}</h2>
                    <p>{selectedAsset._id}</p>
                  </div>
                  <div className="sanity-image-manager__detail-actions">
                    <button onClick={() => void handleCopyUrl()} type="button">
                      Copy URL
                    </button>
                    <a href={selectedAsset.url} rel="noreferrer" target="_blank">
                      Open
                    </a>
                  </div>
                </div>

                <dl className="sanity-image-manager__meta">
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{imageDimensions(selectedAsset)}</dd>
                  </div>
                  <div>
                    <dt>File size</dt>
                    <dd>{fileSize(selectedAsset.size)}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedAsset.mimeType ?? selectedAsset.extension ?? 'Unknown type'}</dd>
                  </div>
                  <div>
                    <dt>Uploaded</dt>
                    <dd>{formatDate(selectedAsset._createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Used by</dt>
                    <dd>{selectedAsset.usedBy ?? 0} documents</dd>
                  </div>
                </dl>

                <div className="sanity-image-manager__form">
                  <label>
                    Title
                    <input
                      onChange={(event) => setDraftTitle(event.currentTarget.value)}
                      type="text"
                      value={draftTitle}
                    />
                  </label>
                  <label>
                    Alt text
                    <input
                      onChange={(event) => setDraftAltText(event.currentTarget.value)}
                      type="text"
                      value={draftAltText}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      onChange={(event) => setDraftDescription(event.currentTarget.value)}
                      rows={3}
                      value={draftDescription}
                    />
                  </label>
                </div>

                <div className="sanity-image-manager__references">
                  <strong>References</strong>
                  {selectedAsset.references?.length ? (
                    <ul>
                      {selectedAsset.references.map((reference) => (
                        <li key={reference._id}>
                          <span>{referenceLabel(reference)}</span>
                          <small>{reference._type}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No document references found.</p>
                  )}
                </div>

                <div className="sanity-image-manager__footer-actions">
                  <button disabled={saving} onClick={() => void handleSaveMetadata()} type="button">
                    {saving ? 'Saving...' : 'Save details'}
                  </button>
                  <button
                    className="sanity-image-manager__danger"
                    disabled={saving || Boolean(selectedAsset.usedBy)}
                    onClick={() => void handleDelete()}
                    title={
                      selectedAsset.usedBy
                        ? 'Images that are still used by documents are protected here.'
                        : 'Delete this image asset'
                    }
                    type="button"
                  >
                    Delete image
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="sanity-image-manager__empty-detail">
              {loading ? 'Loading image library...' : 'Select or upload an image.'}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
