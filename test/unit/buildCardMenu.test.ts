import { describe, expect, it } from 'vitest'

import type { SnippetItem } from '@/context/InklingHostIntegrationContext'
import type { CardMenuNodeClass } from '@/utils/inkling-node-class'

import { buildCardMenu } from '@/utils/buildCardMenu'

const Icon = () => null
type NodeEntries = Array<[string, CardMenuNodeClass]>

describe('buildCardMenu', function () {
  it('adds to Primary section by default', async function () {
    const nodes: NodeEntries = [
      [
        'one',
        {
          cardMenu: {
            label: 'One',
            desc: 'Card test one',
            Icon,
            insertCommand: 'insert_card_one',
          },
        },
      ],
      [
        'two',
        {
          cardMenu: {
            label: 'Two',
            desc: 'Card test two',
            Icon,
            insertCommand: 'insert_card_two',
          },
        },
      ],
    ]

    const cardMenu = buildCardMenu(nodes)

    expect(cardMenu.menu).deep.equal(
      new Map([
        [
          'Primary',
          [
            {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              nodeType: 'one',
            },
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              nodeType: 'two',
            },
          ],
        ],
      ]),
    )

    expect(cardMenu.maxItemIndex).to.equal(1)
  })

  it('can add cards to other headers', async function () {
    const nodes: NodeEntries = [
      [
        'one',
        {
          cardMenu: {
            label: 'One',
            desc: 'Card test one',
            Icon,
            insertCommand: 'insert_card_one',
          },
        },
      ],
      [
        'two',
        {
          cardMenu: {
            label: 'Two',
            desc: 'Card test two',
            section: 'Secondary',
            Icon,
            insertCommand: 'insert_card_two',
          },
        },
      ],
    ]

    const cardMenu = buildCardMenu(nodes)

    expect(cardMenu.menu).deep.equal(
      new Map([
        [
          'Primary',
          [
            {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              nodeType: 'one',
            },
          ],
        ],
        [
          'Secondary',
          [
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              nodeType: 'two',
              section: 'Secondary',
            },
          ],
        ],
      ]),
    )

    expect(cardMenu.maxItemIndex).to.equal(1)
  })

  it('can add multiple items for a single card', async function () {
    const nodes: NodeEntries = [
      [
        'one',
        {
          cardMenu: [
            {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
            },
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
            },
          ],
        },
      ],
    ]

    const cardMenu = buildCardMenu(nodes)

    expect(cardMenu.menu).deep.equal(
      new Map([
        [
          'Primary',
          [
            {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              nodeType: 'one',
            },
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              nodeType: 'one',
            },
          ],
        ],
      ]),
    )
  })

  describe('filtering', function () {
    it('adds all items for blank query', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: ['one'],
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two'],
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: '' })

      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'One',
                desc: 'Card test one',
                Icon,
                insertCommand: 'insert_card_one',
                matches: ['one'],
                nodeType: 'one',
              },
              {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two',
                matches: ['two'],
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )
    })

    it('matches start of strings', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: ['one'],
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two'],
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: 't' })

      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two',
                matches: ['two'],
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )

      expect(cardMenu.maxItemIndex).to.equal(0)
    })

    it('can match against multiple strings', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: ['one'],
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two', 'multiple'],
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: 'mul' })

      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two',
                matches: ['two', 'multiple'],
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )

      expect(cardMenu.maxItemIndex).to.equal(0)
    })

    it('filters all sections', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: ['one'],
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              section: 'Secondary',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two', 'multiple'],
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: 'mul' })

      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Secondary',
            [
              {
                label: 'Two',
                desc: 'Card test two',
                section: 'Secondary',
                Icon,
                insertCommand: 'insert_card_two',
                matches: ['two', 'multiple'],
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )
    })

    it('returns empty menu with no matches', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: ['one'],
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              section: 'Secondary',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two', 'multiple'],
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: 'unknown' })

      expect(cardMenu.menu).deep.equal(new Map())
      expect(cardMenu.maxItemIndex).to.equal(-1)
    })

    it('is case-insensitive', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: ['one'],
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two'],
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: 'Tw' })

      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two',
                matches: ['two'],
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )
    })

    it('can pass function to matches', async function () {
      const matchFn = (query: string, label: string) => label.includes(query)
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One wow',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: matchFn,
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: matchFn,
            },
          },
        ],
      ]

      const cardMenu = buildCardMenu(nodes, { query: 'wow' })

      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'One wow',
                desc: 'Card test one',
                Icon,
                insertCommand: 'insert_card_one',
                matches: matchFn,
                nodeType: 'one',
              },
            ],
          ],
        ]),
      )
    })

    it('can filter snippets', async function () {
      const snippets: SnippetItem[] = [
        { name: 'One snippet', value: '<p>One</p>' },
        { name: 'Two snippet', value: '<p>Two</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'snip', config: { snippets, deleteSnippet: () => {} } })

      expect(cardMenu.menu).toEqual(
        new Map([
          [
            'Snippets',
            [
              {
                Icon: expect.any(Function),
                insertCommand: {
                  type: 'INSERT_SNIPPET_COMMAND',
                },
                insertParams: {
                  name: 'One snippet',
                  value: '<p>One</p>',
                },
                label: 'One snippet',
                matches: expect.any(Function),
                onRemove: expect.any(Function),
                section: 'Snippets',
                type: 'snippet',
              },
              {
                Icon: expect.any(Function),
                insertCommand: {
                  type: 'INSERT_SNIPPET_COMMAND',
                },
                insertParams: {
                  name: 'Two snippet',
                  value: '<p>Two</p>',
                },
                label: 'Two snippet',
                matches: expect.any(Function),
                onRemove: expect.any(Function),
                section: 'Snippets',
                type: 'snippet',
              },
            ],
          ],
        ]),
      )
    })

    it(`doesn't show delete option if createSnippet is not defined`, async function () {
      const snippets: SnippetItem[] = [
        { name: 'One snippet', value: '<p>One</p>' },
        { name: 'Two snippet', value: '<p>Two</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'snippets', config: { snippets } })
      expect(cardMenu.menu).toEqual(
        new Map([
          [
            'Snippets',
            [
              {
                Icon: expect.any(Function),
                insertCommand: {
                  type: 'INSERT_SNIPPET_COMMAND',
                },
                insertParams: {
                  name: 'One snippet',
                  value: '<p>One</p>',
                },
                label: 'One snippet',
                matches: expect.any(Function),
                section: 'Snippets',
                type: 'snippet',
              },
              {
                Icon: expect.any(Function),
                insertCommand: {
                  type: 'INSERT_SNIPPET_COMMAND',
                },
                insertParams: {
                  name: 'Two snippet',
                  value: '<p>Two</p>',
                },
                label: 'Two snippet',
                matches: expect.any(Function),
                section: 'Snippets',
                type: 'snippet',
              },
            ],
          ],
        ]),
      )
    })

    it('returns empty value if no snippet matches ', async function () {
      const snippets: SnippetItem[] = [
        { name: 'One snippet', value: '<p>One</p>' },
        { name: 'Two snippet', value: '<p>Two</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'sniptr', config: { snippets } })
      expect(cardMenu.menu).deep.equal(new Map())
    })

    it('shows all snippets when typing /snippets', async function () {
      const snippets: SnippetItem[] = [
        { name: 'Test1', value: '<p>Test 1</p>' },
        { name: 'Test2', value: '<p>Test 2</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'snippets', config: { snippets, deleteSnippet: () => {} } })

      expect(cardMenu.menu).toEqual(
        new Map([
          [
            'Snippets',
            [
              {
                Icon: expect.any(Function),
                insertCommand: {
                  type: 'INSERT_SNIPPET_COMMAND',
                },
                insertParams: {
                  name: 'Test1',
                  value: '<p>Test 1</p>',
                },
                label: 'Test1',
                matches: expect.any(Function),
                onRemove: expect.any(Function),
                section: 'Snippets',
                type: 'snippet',
              },
              {
                Icon: expect.any(Function),
                insertCommand: {
                  type: 'INSERT_SNIPPET_COMMAND',
                },
                insertParams: {
                  name: 'Test2',
                  value: '<p>Test 2</p>',
                },
                label: 'Test2',
                matches: expect.any(Function),
                onRemove: expect.any(Function),
                section: 'Snippets',
                type: 'snippet',
              },
            ],
          ],
        ]),
      )
    })

    it('can filter based on the post type', async function () {
      const config = { post: { displayName: 'post' } }
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              postType: 'page',
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
            },
          },
        ],
      ]
      const cardMenu = buildCardMenu(nodes, { config })
      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two',
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )
    })

    it('does not filter on post type if missing in config', async function () {
      const nodes: NodeEntries = [
        [
          'one',
          {
            cardMenu: {
              label: 'One',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              postType: 'page',
            },
          },
        ],
        [
          'two',
          {
            cardMenu: {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
            },
          },
        ],
      ]
      const cardMenu = buildCardMenu(nodes)
      expect(cardMenu.menu).deep.equal(
        new Map([
          [
            'Primary',
            [
              {
                label: 'One',
                desc: 'Card test one',
                Icon,
                insertCommand: 'insert_card_one',
                nodeType: 'one',
                postType: 'page',
              },
              {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two',
                nodeType: 'two',
              },
            ],
          ],
        ]),
      )
    })
  })
})
