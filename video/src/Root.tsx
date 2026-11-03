import React from 'react';
import { Composition } from 'remotion';
import { TehsilProgress, FPS, DURATION } from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition id="TehsilProgress" component={TehsilProgress} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);
