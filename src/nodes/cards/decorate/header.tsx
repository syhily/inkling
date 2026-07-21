import type { HeaderNode } from '@/nodes/HeaderNode'

import HeaderNodeComponent from '@/nodes/header/HeaderNodeComponent'

/**
 * Header's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: HeaderNode) {
  return (
    <HeaderNodeComponent
      accentColor={node.accentColor}
      alignment={node.alignment}
      backgroundColor={node.backgroundColor}
      backgroundImageHeight={node.backgroundImageHeight}
      backgroundImageSrc={node.backgroundImageSrc}
      backgroundImageWidth={node.backgroundImageWidth}
      backgroundSize={node.backgroundSize}
      buttonColor={node.buttonColor}
      buttonEnabled={node.buttonEnabled}
      buttonText={node.buttonText}
      buttonTextColor={node.buttonTextColor}
      buttonUrl={node.buttonUrl}
      header={node.header}
      headerTextEditor={node.__headerTextEditor}
      headerTextEditorInitialState={node.__headerTextEditorInitialState}
      isSwapped={node.swapped}
      layout={node.layout}
      nodeKey={node.getKey()}
      subheader={node.subheader}
      subheaderTextEditor={node.__subheaderTextEditor}
      subheaderTextEditorInitialState={node.__subheaderTextEditorInitialState}
      textColor={node.textColor}
    />
  )
}
