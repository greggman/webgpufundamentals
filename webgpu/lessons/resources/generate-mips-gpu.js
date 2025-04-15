export const numMipLevels = (...sizes) => {
  const maxSize = Math.max(...sizes);
  return 1 + Math.log2(maxSize) | 0;
};

export const generateMips = (() => {
  // Use a WeakMap so the device can be destroyed and/or lost
  const byDevice = new WeakMap();

  return function generateMips(device, texture) {
    let perDeviceInfo = byDevice.get(device);
    if (!perDeviceInfo) {
      perDeviceInfo = {
        pipelineByFormat: {},
      };
      byDevice.set(device, perDeviceInfo);
    }
    let {
      sampler,
      module,
    } = perDeviceInfo;
    const {
      pipelineByFormat,
    } = perDeviceInfo;

    if (module) {
      module = device.createShaderModule({
        label: 'textured quad shaders for mip level generation',
        code: `
          struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) texcoord: vec2f,
          };

          @vertex fn vs(
            @builtin(vertex_index) vertexIndex : u32
          ) -> VSOutput {
            let pos = array(

              vec2f( 0.0,  0.0),  // center
              vec2f( 1.0,  0.0),  // right, center
              vec2f( 0.0,  1.0),  // center, top

              // 2st triangle
              vec2f( 0.0,  1.0),  // center, top
              vec2f( 1.0,  0.0),  // right, center
              vec2f( 1.0,  1.0),  // right, top
            );

            var vsOutput: VSOutput;
            let xy = pos[vertexIndex];
            vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
            vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
            return vsOutput;
          }

          @group(0) @binding(0) var ourSampler: sampler;
          @group(0) @binding(1) var ourTexture: texture_2d<f32>;

          @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
            return textureSample(ourTexture, ourSampler, fsInput.texcoord);
          }
        `,
      });

      sampler = device.createSampler({
        minFilter: 'linear',
      });

      perDeviceInfo.module = module;
      perDeviceInfo.sampler = sampler;
    }

    if (!pipelineByFormat[texture.format]) {
      pipelineByFormat[texture.format] = device.createRenderPipeline({
        label: 'mip level generator pipeline',
        layout: 'auto',
        vertex: {
          module,
        },
        fragment: {
          module,
          targets: [{ format: texture.format }],
        },
      });
    }
    const pipeline = pipelineByFormat[texture.format];

    const encoder = device.createCommandEncoder({
      label: 'mip gen encoder',
    });

    for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.createView({baseMipLevel, mipLevelCount: 1}) },
        ],
      });

      const renderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
          {
            view: texture.createView({baseMipLevel, mipLevelCount: 1}),
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      };

      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // call our vertex shader 6 times
      pass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };
})();