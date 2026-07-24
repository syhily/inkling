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

    expect(cardMenu.sections).deep.equal([
      {
        label: 'Primary',
        items: [
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
      },
    ])

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

    expect(cardMenu.sections).deep.equal([
      {
        label: 'Primary',
        items: [
          {
            label: 'One',
            desc: 'Card test one',
            Icon,
            insertCommand: 'insert_card_one',
            nodeType: 'one',
          },
        ],
      },
      {
        label: 'Secondary',
        items: [
          {
            label: 'Two',
            desc: 'Card test two',
            Icon,
            insertCommand: 'insert_card_two',
            nodeType: 'two',
            section: 'Secondary',
          },
        ],
      },
    ])

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

    expect(cardMenu.sections).deep.equal([
      {
        label: 'Primary',
        items: [
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
      },
    ])
  })

  it('returns a flat items list in render order derived from the sections', async function () {
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
      [
        'three',
        {
          cardMenu: {
            label: 'Three',
            desc: 'Card test three',
            Icon,
            insertCommand: 'insert_card_three',
          },
        },
      ],
    ]

    const cardMenu = buildCardMenu(nodes)

    // Primary section first, then declaration order — the same order CardMenu
    // assigns data-inkling-cardmenu-idx
    expect(cardMenu.items.map((item) => item.label)).to.deep.equal(['One', 'Three', 'Two'])
    expect(cardMenu.maxItemIndex).to.equal(cardMenu.items.length - 1)
    // derived from the sections and sharing item identity, so the two views
    // can't drift
    expect(cardMenu.items).to.deep.equal(cardMenu.sections.flatMap((section) => section.items))
    expect(cardMenu.items[0]).toBe(cardMenu.sections[0].items[0])
    expect(cardMenu.items[2]).toBe(cardMenu.sections[1].items[0])
  })

  it('returns an empty items list when nothing matches', async function () {
    const cardMenu = buildCardMenu([], { query: 'unknown' })

    expect(cardMenu.sections).to.deep.equal([])
    expect(cardMenu.items).to.deep.equal([])
    expect(cardMenu.maxItemIndex).to.equal(-1)
  })

  it('hides items gated by isHidden against the host config', async function () {
    const nodes: NodeEntries = [
      [
        'one',
        {
          cardMenu: {
            label: 'One',
            desc: 'Card test one',
            Icon,
            insertCommand: 'insert_card_one',
            isHidden: ({ config }) => !config?.klipy,
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

    expect(buildCardMenu(nodes).items.map((item) => item.label)).to.deep.equal(['Two'])
    expect(
      buildCardMenu(nodes, { config: { klipy: { apiKey: 'key' } } }).items.map((item) => item.label),
    ).to.deep.equal(['One', 'Two'])
  })

  it('resolves function-valued insertParams to plain data', async function () {
    const nodes: NodeEntries = [
      [
        'one',
        {
          cardMenu: {
            label: 'One',
            desc: 'Card test one',
            Icon,
            insertCommand: 'insert_card_one',
            insertParams: () => ({ version: 2 }),
          },
        },
      ],
    ]

    const cardMenu = buildCardMenu(nodes)

    expect(cardMenu.sections[0].items[0].insertParams).to.deep.equal({ version: 2 })
  })

  it('sorts items within a section by priority', async function () {
    const nodes: NodeEntries = [
      [
        'one',
        {
          cardMenu: {
            label: 'One',
            Icon,
            insertCommand: 'insert_card_one',
            priority: 2,
          },
        },
      ],
      [
        'two',
        {
          cardMenu: {
            label: 'Two',
            Icon,
            insertCommand: 'insert_card_two',
          },
        },
      ],
      [
        'three',
        {
          cardMenu: {
            label: 'Three',
            Icon,
            insertCommand: 'insert_card_three',
            priority: 1,
          },
        },
      ],
    ]

    const cardMenu = buildCardMenu(nodes)

    // ascending priority, items without a priority last
    expect(cardMenu.items.map((item) => item.label)).to.deep.equal(['Three', 'One', 'Two'])
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

      expect(cardMenu.sections).deep.equal([
        {
          label: 'Primary',
          items: [
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
        },
      ])
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

      expect(cardMenu.sections).deep.equal([
        {
          label: 'Primary',
          items: [
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two'],
              nodeType: 'two',
            },
          ],
        },
      ])

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

      expect(cardMenu.sections).deep.equal([
        {
          label: 'Primary',
          items: [
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two', 'multiple'],
              nodeType: 'two',
            },
          ],
        },
      ])

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

      expect(cardMenu.sections).deep.equal([
        {
          label: 'Secondary',
          items: [
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two', 'multiple'],
              nodeType: 'two',
              section: 'Secondary',
            },
          ],
        },
      ])
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

      expect(cardMenu.sections).deep.equal([])
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

      expect(cardMenu.sections).deep.equal([
        {
          label: 'Primary',
          items: [
            {
              label: 'Two',
              desc: 'Card test two',
              Icon,
              insertCommand: 'insert_card_two',
              matches: ['two'],
              nodeType: 'two',
            },
          ],
        },
      ])
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

      expect(cardMenu.sections).deep.equal([
        {
          label: 'Primary',
          items: [
            {
              label: 'One wow',
              desc: 'Card test one',
              Icon,
              insertCommand: 'insert_card_one',
              matches: matchFn,
              nodeType: 'one',
            },
          ],
        },
      ])
    })

    it('can filter snippets', async function () {
      const snippets: SnippetItem[] = [
        { name: 'One snippet', value: '<p>One</p>' },
        { name: 'Two snippet', value: '<p>Two</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'snip', config: { snippets, deleteSnippet: () => {} } })

      expect(cardMenu.sections).toEqual([
        {
          label: 'Snippets',
          items: [
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
        },
      ])
    })

    it(`doesn't show delete option if createSnippet is not defined`, async function () {
      const snippets: SnippetItem[] = [
        { name: 'One snippet', value: '<p>One</p>' },
        { name: 'Two snippet', value: '<p>Two</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'snippets', config: { snippets } })
      expect(cardMenu.sections).toEqual([
        {
          label: 'Snippets',
          items: [
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
        },
      ])
    })

    it('returns empty value if no snippet matches ', async function () {
      const snippets: SnippetItem[] = [
        { name: 'One snippet', value: '<p>One</p>' },
        { name: 'Two snippet', value: '<p>Two</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'sniptr', config: { snippets } })
      expect(cardMenu.sections).deep.equal([])
    })

    it('shows all snippets when typing /snippets', async function () {
      const snippets: SnippetItem[] = [
        { name: 'Test1', value: '<p>Test 1</p>' },
        { name: 'Test2', value: '<p>Test 2</p>' },
      ]
      const cardMenu = buildCardMenu([], { query: 'snippets', config: { snippets, deleteSnippet: () => {} } })

      expect(cardMenu.sections).toEqual([
        {
          label: 'Snippets',
          items: [
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
        },
      ])
    })
  })
})
