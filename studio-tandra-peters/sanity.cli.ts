import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '7irm699i',
    dataset: 'production',
  },
  deployment: {
    appId: 'on6anif3y43e3t03oiwrgp30',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    basePath: '/studio',
  },
})
