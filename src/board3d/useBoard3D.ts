'use client';

import { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import * as THREE from 'three';
import type { Board3DGameState, Board3DHandle, PieceInstance } from './types';
import { setupScene } from './scene';
import { createBoard } from './board';
import { loadPieceGeometries, initPiecesFromFen, clearPieces, type Geometries } from './pieces';
import { animateTurnDestinationPing, animateLightningStrike, animateCapture, animateJump, setReplayAnimationSpeed } from './animations';
import { squareToXZ } from './squareUtils';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type VerboseMove = {
  from: string;
  to: string;
  flags: string;
  san: string;
  color: 'w' | 'b';
  piece: string;
  captured?: string;
  promotion?: string;
};

export function useBoard3D(
  whiteName: string,
  blackName: string,
  onGameStateChange?: (state: Board3DGameState) => void,
  inputEnabled = true
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateCallbackRef = useRef(onGameStateChange);
  const inputEnabledRef = useRef(inputEnabled);
  const handleRef = useRef<Board3DHandle>({
    applyMove: () => {},
    resetToPosition: () => {},
    highlightSquare: () => {},
    flashSquare: () => {},
  });

  gameStateCallbackRef.current = onGameStateChange;
  inputEnabledRef.current = inputEnabled;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupScene(canvas);
    const { boardGroup } = createBoard(ctx.scene, whiteName, blackName);
    const piecesContainer = new THREE.Group();
    ctx.scene.add(piecesContainer);
    const effectsGroup = new THREE.Group();
    const interactionGroup = new THREE.Group();
    boardGroup.add(effectsGroup);
    boardGroup.add(interactionGroup);

    const pieceMap = new Map<string, PieceInstance>();
    let geos: Geometries = {};
    let ready = false;
    let disposed = false;
    let queueVersion = 0;
    let logicalChess = new Chess(START_FEN);
    let pendingFen: string | null = START_FEN;
    let moveChain = Promise.resolve();
    let selectedSquare: string | null = null;
    let selectedMoves: VerboseMove[] = [];
    let inputLocked = false;
    let resolveReady: (() => void) | null = null;
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    const getGameStatus = () => {
      if (logicalChess.isCheckmate()) {
        return `${logicalChess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`;
      }
      if (logicalChess.isStalemate()) return 'Draw by stalemate';
      if (logicalChess.isDraw()) return 'Draw';
      const side = logicalChess.turn() === 'w' ? 'White' : 'Black';
      return logicalChess.isCheck() ? `${side} to move - check` : `${side} to move`;
    };

    const emitGameState = (status = getGameStatus()) => {
      gameStateCallbackRef.current?.({
        status,
        fen: logicalChess.fen(),
        selectedSquare,
      });
    };

    const resetPieceVisuals = () => {
      pieceMap.forEach(inst => {
        const ls = inst.group.children[0] as THREE.LineSegments | undefined;
        if (ls?.material) {
          const m = ls.material as THREE.LineBasicMaterial;
          m.color.setHex(inst.color === 'w' ? 0x00ffff : 0x22aaff);
          m.opacity = inst.color === 'w' ? 0.8 : 0.7;
        }
        inst.haloMat.opacity = 0;
        inst.haloGroup.visible = false;
      });
    };

    const clearInteractionMarkers = () => {
      interactionGroup.traverse((child) => {
        const c = child as THREE.Object3D & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => m.dispose());
        }
      });
      interactionGroup.clear();
    };

    const createSquareMarker = (square: string, isCapture: boolean) => {
      const { x, z } = squareToXZ(square);
      const color = isCapture ? 0xff315c : 0x7dff00;
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const ringMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: isCapture ? 0.9 : 0.75,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 40 }, (_, i) => {
            const a = (i / 40) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 0.32, 0.052, Math.sin(a) * 0.32);
          })
        ),
        ringMat
      );
      ring.renderOrder = 30;
      group.add(ring);

      const dotMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isCapture ? 0.18 : 0.24,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.y = 0.045;
      dot.renderOrder = 29;
      group.add(dot);

      interactionGroup.add(group);
    };

    const showSelection = (square: string, moves: VerboseMove[]) => {
      resetPieceVisuals();
      clearInteractionMarkers();

      const inst = pieceMap.get(square);
      if (inst) {
        const ls = inst.group.children[0] as THREE.LineSegments | undefined;
        if (ls?.material) {
          const m = ls.material as THREE.LineBasicMaterial;
          m.color.setHex(0x00ffaa);
          m.opacity = 1;
        }
        inst.haloMat.opacity = 1;
        inst.haloGroup.visible = true;
      }

      moves.forEach((move) => createSquareMarker(move.to, Boolean(move.captured) || move.flags.includes('c') || move.flags.includes('e')));
    };

    const clearSelection = () => {
      selectedSquare = null;
      selectedMoves = [];
      resetPieceVisuals();
      clearInteractionMarkers();
      emitGameState();
    };

    const clearSelectionVisuals = () => {
      selectedSquare = null;
      selectedMoves = [];
      resetPieceVisuals();
      clearInteractionMarkers();
    };

    const boardPointToSquare = (point: THREE.Vector3) => {
      const file = Math.floor(point.x + 4);
      const rankIndex = Math.floor(point.z + 4);
      if (file < 0 || file > 7 || rankIndex < 0 || rankIndex > 7) return null;
      return `${String.fromCharCode(97 + file)}${rankIndex + 1}`;
    };

    const clearEffects = () => {
      effectsGroup.traverse((child) => {
        const c = child as THREE.Object3D & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
          userData?: { spinTween?: { kill?: () => void } };
        };

        c.userData?.spinTween?.kill?.();
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => m.dispose());
        }
      });

      effectsGroup.clear();
    };

    const syncBoardToFen = (fen: string) => {
      clearEffects();
      clearInteractionMarkers();
      clearPieces(pieceMap, piecesContainer);
      const fresh = initPiecesFromFen(fen, geos, piecesContainer);
      fresh.forEach((v, k) => pieceMap.set(k, v));
    };

    const setLogicalPosition = (fen: string) => {
      logicalChess = new Chess(fen);
      pendingFen = fen;
      selectedSquare = null;
      selectedMoves = [];
      inputLocked = false;

      if (!ready) return;

      syncBoardToFen(fen);
      pendingFen = null;
      emitGameState();
    };

    const isCurrentVersion = (version: number) => !disposed && version === queueVersion;

    const resolveMoveWithWatchdog = (
      moveTask: Promise<void>,
      version: number,
      fallbackFen: string,
      timeoutMs = 9000
    ) =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve();
        };
        const recover = (message: string, error?: unknown) => {
          if (!isCurrentVersion(version)) return;
          if (error) console.warn(message, error);
          else console.warn(message);
          queueVersion += 1;
          inputLocked = false;
          syncBoardToFen(fallbackFen);
          emitGameState();
        };
        const timer = window.setTimeout(() => {
          recover('[Board3D] Move animation timed out; resyncing board state and restoring input.');
          finish();
        }, timeoutMs);

        moveTask.then(finish, (error) => {
          recover('[Board3D] Move animation failed; resyncing board state and restoring input.', error);
          finish();
        });
      });

    const runMove = (
      from: string,
      to: string,
      isCapture: boolean,
      flags: string,
      promotion: string | undefined,
      speedMultiplier: number,
      version: number
    ) =>
      new Promise<void>((resolve) => {
        if (!isCurrentVersion(version) || !ready) {
          resolve();
          return;
        }

        let logicalMove: ReturnType<Chess['move']>;
        try {
          logicalMove = logicalChess.move({
            from,
            to,
            promotion: promotion?.toLowerCase() as 'q' | 'r' | 'b' | 'n' | undefined,
          });
        } catch (error) {
          console.warn(`[Board3D] Illegal move ${from}${to}; resetting visual board to the last known good position.`, error);
          syncBoardToFen(logicalChess.fen());
          resolve();
          return;
        }

        if (!logicalMove) {
          console.warn(`[Board3D] Move ${from}${to} could not be applied; resetting visual board to the last known good position.`);
          syncBoardToFen(logicalChess.fen());
          resolve();
          return;
        }

        const targetFen = logicalChess.fen();
        const shouldResyncAfterMove = Boolean(logicalMove.promotion);
        const actor = pieceMap.get(from);
        if (!actor) {
          console.warn(`[Board3D] Missing piece at ${from}; resyncing the visual board to preserve replay fidelity.`);
          syncBoardToFen(targetFen);
          resolve();
          return;
        }

        // Persistent "moving" highlight across the full move sequence.
        const actorWire = actor.group.children.find((child) => child.type === 'LineSegments') as THREE.LineSegments | undefined;
        const actorWireMat = actorWire?.material as THREE.LineBasicMaterial | undefined;
        const actorOriginalColor = actorWireMat?.color.clone();
        const actorOriginalOpacity = actorWireMat?.opacity;
        if (actorWireMat) {
          actorWireMat.color.setHex(0x7dff00);
          actorWireMat.opacity = 1;
        }
        const restoreActorHighlight = () => {
          if (!actorWireMat || !actorOriginalColor || actorOriginalOpacity == null) return;
          actorWireMat.color.copy(actorOriginalColor);
          actorWireMat.opacity = actorOriginalOpacity;
        };

        // Handle castling: teleport rook before king animation
        if (flags.includes('k') || flags.includes('q')) {
          const isKingside = flags.includes('k');
          const rank = from[1]; // '1' for white, '8' for black
          const rookFrom = (isKingside ? 'h' : 'a') + rank;
          const rookTo = (isKingside ? 'f' : 'd') + rank;
          const rook = pieceMap.get(rookFrom);
          if (rook) {
            const { x, z } = squareToXZ(rookTo);
            rook.group.position.set(x, 0, z);
            pieceMap.delete(rookFrom);
            rook.square = rookTo;
            pieceMap.set(rookTo, rook);
          }
        }

        setReplayAnimationSpeed(speedMultiplier);
        animateTurnDestinationPing(to, effectsGroup, () => {
          if (!isCurrentVersion(version)) {
            restoreActorHighlight();
            resolve();
            return;
          }

          animateLightningStrike(from, to, effectsGroup, () => {
            if (!isCurrentVersion(version)) {
              restoreActorHighlight();
              resolve();
              return;
            }

            const finishActorMove = () => {
              if (!isCurrentVersion(version)) {
                restoreActorHighlight();
                resolve();
                return;
              }
              pieceMap.delete(from);
              actor.square = to;
              pieceMap.set(to, actor);
              if (shouldResyncAfterMove) {
                syncBoardToFen(targetFen);
              }
              restoreActorHighlight();
              resolve();
            };

            if (isCapture) {
              // For en passant, the captured pawn is on the same file as `to` but same rank as `from`
              const capturedSquare = flags.includes('e') ? to[0] + from[1] : to;
              const victim = pieceMap.get(capturedSquare);
              if (victim && capturedSquare !== to) pieceMap.delete(capturedSquare);
              if (victim) {
                pieceMap.delete(to);
                animateCapture(victim, effectsGroup, piecesContainer, () => {
                  if (!isCurrentVersion(version)) {
                    resolve();
                    return;
                  }
                  animateJump(actor, to, effectsGroup, finishActorMove);
                });
              } else {
                animateJump(actor, to, effectsGroup, finishActorMove);
              }
            } else {
              animateJump(actor, to, effectsGroup, finishActorMove);
            }
          });
        });
      });

    loadPieceGeometries().then(loaded => {
      if (disposed) return;
      geos = loaded;
      ready = true;
      syncBoardToFen(pendingFen ?? START_FEN);
      pendingFen = null;
      resolveReady?.();
      resolveReady = null;
      emitGameState();
    }).catch((error) => {
      if (disposed) return;
      console.warn('[Board3D] Geometry load failed; using fallback wireframes only.', error);
      ready = true;
      syncBoardToFen(pendingFen ?? START_FEN);
      pendingFen = null;
      resolveReady?.();
      resolveReady = null;
      emitGameState();
    });

    let animId: number;
    const tick = () => {
      animId = requestAnimationFrame(tick);
      ctx.controls.update();
      pieceMap.forEach(inst => {
        inst.haloGroup.position.x = inst.group.position.x;
        inst.haloGroup.position.z = inst.group.position.z;
      });
      ctx.composer.render();
    };
    tick();

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.14;
    const pointer = new THREE.Vector2();
    const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const boardHit = new THREE.Vector3();
    let pointerDown: { x: number; y: number } | null = null;

    const chessGlobal = (window as typeof window & { __chess?: any }).__chess;
    let boardDebugApi: { squareToClient(square: string): { x: number; y: number } | null } | null = null;
    if (chessGlobal) {
      chessGlobal.boardLabels = {
        whiteName,
        blackName,
        whiteSide: 'rank-1',
        blackSide: 'rank-8',
      };
      boardDebugApi = {
        squareToClient(square: string) {
          if (!/^[a-h][1-8]$/.test(square)) return null;
          const { x, z } = squareToXZ(square);
          const rect = canvas.getBoundingClientRect();
          const projected = new THREE.Vector3(x, 0, z).project(ctx.camera);
          return {
            x: rect.left + ((projected.x + 1) * rect.width) / 2,
            y: rect.top + ((-projected.y + 1) * rect.height) / 2,
          };
        },
      };
      chessGlobal.board3d = boardDebugApi;
    }

    const eventToSquare = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, ctx.camera);

      const planeHit = raycaster.ray.intersectPlane(boardPlane, boardHit);
      const boardSquare = planeHit ? boardPointToSquare(boardHit) : null;
      if (boardSquare && selectedSquare && selectedMoves.some((move) => move.to === boardSquare)) {
        return boardSquare;
      }
      if (boardSquare) {
        const boardPiece = logicalChess.get(boardSquare as Square);
        if (boardPiece?.color === logicalChess.turn()) {
          const moves = logicalChess.moves({ square: boardSquare as Square, verbose: true }) as VerboseMove[];
          if (moves.length > 0) return boardSquare;
        }
      }

      let closestPieceSquare: string | null = null;
      let closestPieceDistance = Infinity;
      pieceMap.forEach((inst, square) => {
        const hit = raycaster.intersectObject(inst.group, true)[0];
        if (hit && hit.distance < closestPieceDistance) {
          closestPieceDistance = hit.distance;
          closestPieceSquare = square;
        }
      });
      if (closestPieceSquare) return closestPieceSquare;

      return boardSquare;
    };

    const selectSquare = (square: string) => {
      const piece = logicalChess.get(square as Square);
      if (!piece || piece.color !== logicalChess.turn()) {
        clearSelection();
        return;
      }

      const moves = logicalChess.moves({ square: square as Square, verbose: true }) as VerboseMove[];
      if (moves.length === 0) {
        clearSelection();
        return;
      }

      selectedSquare = square;
      selectedMoves = moves;
      showSelection(square, moves);
      emitGameState(`${piece.color === 'w' ? 'White' : 'Black'} selected ${square}`);
    };

    const playSelectedMove = (move: VerboseMove) => {
      inputLocked = true;
      clearSelectionVisuals();

      const version = queueVersion;
      const movingSide = logicalChess.turn() === 'w' ? 'White' : 'Black';
      emitGameState(`${movingSide} plays ${move.san}`);

      moveChain = moveChain
        .catch(() => undefined)
        .then(async () => {
          await readyPromise;
          return resolveMoveWithWatchdog(
            runMove(
              move.from,
              move.to,
              Boolean(move.captured) || move.flags.includes('c') || move.flags.includes('e'),
              move.flags,
              move.promotion ?? (move.piece === 'p' && (move.to[1] === '1' || move.to[1] === '8') ? 'q' : undefined),
              2.2,
              version
            ),
            version,
            logicalChess.fen()
          );
        })
        .then(() => {
          if (!isCurrentVersion(version)) return;
          inputLocked = false;
          emitGameState();
        })
        .catch((error) => {
          console.warn('[Board3D] Interactive move failed.', error);
          if (!isCurrentVersion(version)) return;
          inputLocked = false;
          syncBoardToFen(logicalChess.fen());
          emitGameState();
        });
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (inputLocked || !inputEnabledRef.current || !ready || logicalChess.isGameOver()) return;
      pointerDown = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture?.(event.pointerId);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (event.button !== 0 || !pointerDown || inputLocked || !inputEnabledRef.current || !ready || logicalChess.isGameOver()) {
        pointerDown = null;
        return;
      }

      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      pointerDown = null;
      if (Math.hypot(dx, dy) > 8) return;

      const square = eventToSquare(event);
      if (!square) {
        clearSelection();
        return;
      }

      const targetMoves = selectedMoves.filter((move) => move.to === square);
      const chosenMove = targetMoves.find((move) => move.promotion === 'q') ?? targetMoves[0];
      if (selectedSquare && chosenMove) {
        playSelectedMove(chosenMove);
        return;
      }

      selectSquare(square);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      pointerDown = null;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('lostpointercapture', handlePointerCancel);
    emitGameState('Loading pieces');

    handleRef.current = {
      applyMove(from, to, isCapture, flags, _promotion, speedMultiplier = 1) {
        const version = queueVersion;
        inputLocked = true;
        clearSelectionVisuals();
        moveChain = moveChain
          .catch(() => undefined)
          .then(async () => {
            await readyPromise;
            return resolveMoveWithWatchdog(
              runMove(from, to, isCapture, flags, _promotion, speedMultiplier, version),
              version,
              logicalChess.fen()
            );
          })
          .then(() => {
            if (!isCurrentVersion(version)) return;
            inputLocked = false;
            emitGameState();
          })
          .catch((error) => {
            console.warn('[Board3D] External move failed.', error);
            if (!isCurrentVersion(version)) return;
            inputLocked = false;
            syncBoardToFen(logicalChess.fen());
            emitGameState();
          });
      },

      resetToPosition(fen) {
        queueVersion += 1;
        moveChain = Promise.resolve();
        setLogicalPosition(fen);
      },

      highlightSquare(square) {
        resetPieceVisuals();
        if (square) {
          const inst = pieceMap.get(square);
          if (inst) {
            const ls = inst.group.children[0] as THREE.LineSegments | undefined;
            if (ls?.material) {
              const m = ls.material as THREE.LineBasicMaterial;
              m.color.setHex(0x00ffaa);
              m.opacity = 1.0;
            }
            inst.haloMat.opacity = 1;
            inst.haloGroup.visible = true;
          }
        }
      },

      flashSquare(square) {
        if (!ready || disposed) return;
        const normalized = square.trim().toLowerCase();
        if (!/^[a-h][1-8]$/.test(normalized)) return;
        setReplayAnimationSpeed(1);
        animateTurnDestinationPing(normalized, effectsGroup, () => {});
      },
    };

    return () => {
      disposed = true;
      queueVersion += 1;
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('lostpointercapture', handlePointerCancel);
      cancelAnimationFrame(animId);
      clearEffects();
      clearInteractionMarkers();
      clearPieces(pieceMap, piecesContainer);
      if (chessGlobal?.board3d === boardDebugApi) delete chessGlobal.board3d;
      if (chessGlobal?.boardLabels?.whiteName === whiteName && chessGlobal?.boardLabels?.blackName === blackName) {
        delete chessGlobal.boardLabels;
      }
      ctx.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { canvasRef, handleRef };
}
