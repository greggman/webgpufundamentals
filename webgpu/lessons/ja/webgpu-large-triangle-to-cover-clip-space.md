Title: WebGPU クリップ空間をカバーする大きな三角形
Description: クリップ空間をカバーする大きな三角形
TOC: 大きなクリップ空間の三角形

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

これは小さな*トリック*/*パターン*であり、マイナーな最適化です。

多くの場合、フルスクリーン、フルキャンバス、フルテクスチャのクワッドを描画する必要があります。つまり、クリップ空間全体をカバーする長方形です。

これを行う最も明白な方法は、2つの三角形からクワッドを作成することです。

<div class="webgpu_center">
  <div>
    <img style="width: 342px;" src="resources/quad-triangles.svg">
    <div>2つの三角形によるクリップ空間クワッド</div>
  </div>
</div>


```
    // 左下の三角形
    -1, -1,
     1, -1,
    -1,  1,

    // 右上の三角形
    -1,  1,
     1, -1,
     1,  1,
```

頂点シェーダーでデータを渡すか、シェーダーにハードコーディングするかに関係なく、これは一般的なニーズです。これは何度か使用しました。たとえば、[テクスチャのインポートに関する記事でのミップマップの生成](webgpu-importing-textures.html)です。

これは機能し、理解しやすいです。

ただし、この特定のケースにはショートカットがあります。代わりに、クリップ空間領域全体をカバーするのに十分な大きさの単一の三角形を作成できます。簡単な例は次の三角形です。

<div class="webgpu_center">
  <div>
    <img style="width: 512px;" src="resources/quad-triangle.svg">
    <div>ピンク = クリップ空間</div>
  </div>
</div>

これは6つではなく3つの頂点だけです。

```
    -1,  3,
     3, -1,
    -1, -1,
```

GPUはこの三角形をクリップ空間にクリップするため、6つの三角形のクワッドと同じ結果が得られますが、入力の手間が少し省けます。

それに加えて、GPUは通常、2x2ピクセル単位でピクセルを描画します。これにはさまざまな理由がありますが、1つは効率を上げるためです。したがって、2つの三角形を描画する場合、2つの三角形が接する端に沿って、GPUは余分な作業を行う必要があります。2x2の正方形を処理したいのですが、各三角形が実際に描画する必要のある1つまたは2つのピクセルのみを描画するために余分な作業を行う必要があります。

単一の三角形を描画することで、この余分な作業を回避できます。

実際のところ、この余分な作業はごくわずかです。フルスクリーンクワッドの場合、おそらく60Hzフレームの0.5％未満しか使用しません。何もないわけではありませんが、アプリがスムーズに実行されるか遅くなるかの違いになる可能性は低いです。

とはいえ、3つの頂点を入力する方が6つの頂点を入力するよりも簡単なので、パフォーマンスの向上はごくわずかであっても、適切な場合に使用すると気持ちの良いパターンです。例としては、ミップマップの生成、スカイボックスの描画、後処理、シェーダートイの作成など、完全なクリップ空間クワッドを描画する必要がある場合です。